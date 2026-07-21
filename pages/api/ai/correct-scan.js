// Groq LLM integration with local fallback – handles Nigerian name variants gracefully
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(rawText) {
  const systemPrompt = `You are an AI assistant for FIDUCIA CARE, a church management platform in Nigeria.
Your task is to take raw OCR output from an attendance register photo and return a clean, structured JSON array of people.

RULES:
- The register contains handwritten names and phone numbers, sometimes on the same line, sometimes on separate lines.
- Extract EVERY person mentioned. If a phone number appears on its own line, attach it to the previous name.
- Names can appear in many forms: "Jerry", "Bro Emma", "Sis Peace", "Evang John", "Pastor Mrs Ade", "Ogechi Faith", "Ngozi", "Mr Chinedu Okafor". Keep the FULL name as written – do NOT split into first/last. The "name" field should be the complete string.
- Normalize phone numbers to Nigerian format: if it starts with '0', prepend '+234'. If it starts with '234', add '+'. Remove slashes, spaces, and other non-digit characters.
- Correct obvious OCR mistakes in names (e.g., "BL ERELL" → likely "Blessing Emelie"). Use common sense and context.
- For each person, provide a confidence score between 0 and 100. Use 95+ for clear, common names, 80-90 for ones with minor corrections, and 70-80 for heavily corrected ones.
- Return ONLY a JSON array, no other text.

FORMAT:
[
  {
    "name": "Sis Blessing Faith",
    "phone": "+234...",
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

  // Remove markdown fences if present
  const clean = content.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error('Response is not an array');
  } catch (parseErr) {
    console.error('Failed to parse Groq response:', clean);
    throw new Error('Groq response was not valid JSON');
  }
  return parsed;
}

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

  for (let line of lines) {
    line = line.replace(/[\\\/]/g, ' ').replace(/\s+/g, ' ').trim();

    if (isHeader(line)) continue;

    if (isPhoneLike(line) && !/[a-zA-Z]{2,}/.test(line)) {
      pendingPhone = line.replace(/\s/g, '');
      continue;
    }

    const phoneMatch = line.match(/(.*?)([0-9+\-\s]{8,})$/);
    let namePart = line;
    let phonePart = null;

    if (phoneMatch) {
      namePart = phoneMatch[1].trim();
      phonePart = phoneMatch[2].replace(/\s/g, '');
    }

    // Accept any line that has at least one letter and length >= 2
    if (namePart.length >= 2 && /[a-zA-Z]/.test(namePart)) {
      const phone = phonePart || pendingPhone || '';
      let normalizedPhone = '';
      if (phone) {
        normalizedPhone = phone.replace(/[\s\-\/\\|]/g, '');
        if (normalizedPhone.startsWith('0')) normalizedPhone = '+234' + normalizedPhone.substring(1);
        if (normalizedPhone.startsWith('234') && !normalizedPhone.startsWith('+')) normalizedPhone = '+' + normalizedPhone;
      }
      people.push({
        name: namePart,
        phone: normalizedPhone,
        confidence: namePart.length > 5 ? 85 : 80,
      });
      pendingPhone = null;
    }
  }

  if (pendingPhone && people.length > 0) {
    people[people.length - 1].phone = pendingPhone;
    people[people.length - 1].confidence = Math.min(people[people.length - 1].confidence + 5, 100);
  }

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const p of people) {
    const key = `${p.name}|${p.phone}`;
    if (!seen.has(key)) {
      unique.push(p);
      seen.add(key);
    }
  }
  return unique;
}

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
        console.error('Groq failed, falling back to local:', groqErr.message);
        people = localFallback(rawText);
      }
    } else {
      people = localFallback(rawText);
    }

    // Ensure no null/empty names
    const validPeople = people.filter(p => p.name && p.name.trim().length > 0);

    // Clean bare country codes and very short phone numbers
    const cleanedPeople = validPeople.map(p => {
      let phone = p.phone;
      if (phone === '+234' || phone.length < 10) phone = '';
      return { ...p, phone };
    });

    console.log('Raw OCR text:', rawText);
    console.log('Corrected people (used Groq:', usedGroq, '):', cleanedPeople);

    return res.status(200).json({ people: cleanedPeople });
  } catch (error) {
    console.error('AI correction error:', error);
    // Return a 500 but with a clear message, the scan endpoint can handle it
    return res.status(500).json({ error: error.message || 'Internal error in AI correction' });
  }
      }
