// FIDUCIA CARE – AI Document Understanding (Groq + powerful local fallback)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Robust Groq caller ──
async function callGroq(rawText) {
  const systemPrompt = `You are an AI document understanding assistant for FIDUCIA CARE, a church management platform in Nigeria.
Your input is the raw, messy OCR text from an attendance register. The register has two columns: Names and Phone Numbers.

Your job is to:
1. **Detect the table rows.** Even if the OCR text is jumbled, group lines that belong to the same person.
2. **Split each row into Name and Phone Number.** Use Nigerian phone number patterns (starting with 080, 081, 070, 090, etc.) to identify the phone number.
3. **Correct OCR mistakes** in names (e.g., "Sis Sandro Isucbel" → "Sis Sandra Isichei"). Use common sense, Nigerian name knowledge, and the fact that many names start with "Sis", "Bro", "Pastor", "Mrs", "Mr", "Evang", etc.
4. **Normalize phone numbers** to the format +234XXXXXXXXXX. Remove all spaces and symbols. If a phone number is incomplete, set it to empty.
5. **Output confidence** between 0 and 100 for each person. High confidence (90+) for names that are clear and phone numbers that look correct. Medium (80-89) for minor corrections. Low (70-79) for heavy corrections.
6. **Return ONLY a JSON array**, no other text.

Format:
[
  {
    "name": "Sis Sandra Isichei",
    "phone": "+2348039529158",
    "confidence": 95
  },
  ...
]`;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Groq API error');
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Groq returned empty response');

  // Remove markdown fences and any surrounding non-JSON text
  let clean = content.replace(/```json|```/g, '').trim();
  // Try to extract the JSON array if there is extra text before/after
  const arrayMatch = clean.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    clean = arrayMatch[0];
  } else {
    throw new Error('No JSON array found in Groq response');
  }

  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed)) throw new Error('Response is not an array');
  return parsed;
}

// ── Powerful local fallback (tuned for Nigerian registers) ──
function localFallback(rawText) {
  const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);
  const people = [];
  let pendingPhone = null;

  const isPhoneLike = (str) => {
    const digits = str.replace(/\D/g, '');
    return digits.length >= 8;
  };

  const isHeader = (str) =>
    /^(name|phone|telephone|attendance|date|program|service|total)$/i.test(str);

  // Nigerian title prefixes
  const titlePrefixes = /^(sis|bro|past|mrs|mr|evang|deacon|deac|prophet|apostle|rev|dr|prof|chief|engr|barr|hon)/i;

  for (let line of lines) {
    // Replace slashes, pipes, commas that break words
    line = line.replace(/[\\\/\|,]/g, ' ').replace(/\s+/g, ' ').trim();

    if (isHeader(line)) continue;

    // If line is almost all digits, treat as phone
    if (isPhoneLike(line) && !/[a-zA-Z]{2,}/.test(line)) {
      pendingPhone = line.replace(/\s/g, '');
      continue;
    }

    // Try to separate a trailing phone number
    const phoneMatch = line.match(/(.*?)([0-9+\-\s]{8,})$/);
    let namePart = line;
    let phonePart = null;

    if (phoneMatch) {
      namePart = phoneMatch[1].trim();
      phonePart = phoneMatch[2].replace(/\s/g, '');
    }

    // Must contain at least one letter and length >= 2
    if (namePart.length >= 2 && /[a-zA-Z]/.test(namePart)) {
      const phone = phonePart || pendingPhone || '';
      let normalizedPhone = '';
      if (phone) {
        normalizedPhone = phone.replace(/[\s\-\/\\|]/g, '');
        if (normalizedPhone.startsWith('0')) normalizedPhone = '+234' + normalizedPhone.substring(1);
        if (normalizedPhone.startsWith('234') && !normalizedPhone.startsWith('+')) normalizedPhone = '+' + normalizedPhone;
        // Nigerian numbers should be 10-13 digits; otherwise discard
        const digits = normalizedPhone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) normalizedPhone = '';
      }

      let confidence = 80;
      // Higher confidence if name is longer or starts with a known title
      if (namePart.length > 10) confidence = 90;
      if (titlePrefixes.test(namePart.split(' ')[0])) confidence += 5;
      if (normalizedPhone && normalizedPhone.length >= 11) confidence += 5;
      confidence = Math.min(confidence, 100);

      people.push({
        name: namePart,
        phone: normalizedPhone,
        confidence,
      });
      pendingPhone = null;
    }
  }

  // Attach any leftover phone to the last person
  if (pendingPhone && people.length > 0) {
    people[people.length - 1].phone = pendingPhone;
    people[people.length - 1].confidence = Math.min(people[people.length - 1].confidence + 5, 100);
  }

  // Merge obvious split names (e.g., "Sis" on one line, "Sandra Isichei" on next)
  const merged = [];
  let carry = null;
  for (const p of people) {
    if (carry) {
      // If current has no title and the carried word looks like a title, concatenate
      if (!titlePrefixes.test(p.name.split(' ')[0]) && titlePrefixes.test(carry)) {
        merged.push({ ...p, name: carry + ' ' + p.name, confidence: Math.max(p.confidence, 85) });
        carry = null;
        continue;
      } else {
        merged.push(carry);
        carry = null;
      }
    }
    // If a single word is a known title, carry it to next
    if (titlePrefixes.test(p.name) && p.name.split(' ').length === 1) {
      carry = p.name;
    } else {
      merged.push(p);
    }
  }
  if (carry) merged.push({ name: carry, phone: '', confidence: 70 });

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const p of merged) {
    const key = `${p.name}|${p.phone}`;
    if (!seen.has(key)) {
      unique.push(p);
      seen.add(key);
    }
  }
  return unique;
}

// ── API handler ──
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'No text provided' });

  try {
    let people = [];
    let usedGroq = false;

    if (GROQ_API_KEY) {
      try {
        people = await callGroq(rawText);
        usedGroq = true;
      } catch (groqErr) {
        console.error('Groq failed, using powerful local parser:', groqErr.message);
        people = localFallback(rawText);
      }
    } else {
      people = localFallback(rawText);
    }

    // Final cleaning: remove entries without name, fix bare +234, short phones
    const cleanedPeople = people
      .filter(p => p.name && p.name.trim().length > 0)
      .map(p => {
        let phone = (p.phone || '').replace(/\s+/g, '');
        const digits = phone.replace(/\D/g, '');
        if (phone === '+234' || digits.length < 10 || digits.length > 13) phone = '';
        return { ...p, phone };
      });

    console.log('Raw OCR text:', rawText);
    console.log('Corrected people (Groq:', usedGroq, '):', cleanedPeople);

    return res.status(200).json({ people: cleanedPeople });
  } catch (error) {
    console.error('AI correction error:', error);
    return res.status(500).json({ error: error.message || 'Internal error in AI correction' });
  }
}
