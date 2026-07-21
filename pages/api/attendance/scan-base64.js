import pool from '../../../lib/db';
import { matchNamesToMembers } from '../../../lib/fuzzyMatch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { church_id, program_name, image_base64 } = req.body;
  if (!image_base64) return res.status(400).json({ error: 'No image data received' });

  let base64 = image_base64.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
  if (base64.length < 100) return res.status(400).json({ error: 'Image too small or corrupted.' });

  const churchId = church_id || 'demo-church';
  const programName = program_name || 'GIBEON';

  try {
    // ---------- 1. OCR ----------
    console.log('Starting OCR...');
    const params = new URLSearchParams();
    params.append('base64Image', `data:image/jpeg;base64,${base64}`);
    params.append('apikey', process.env.OCR_SPACE_API_KEY || 'helloworld');
    params.append('language', 'eng');
    params.append('isOverlayRequired', 'false');
    params.append('detectOrientation', 'true');
    params.append('scale', 'true');
    params.append('OCREngine', '2');
    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const ocrData = await ocrRes.json();
    if (ocrData.IsErroredOnProcessing || !ocrData.ParsedResults?.length) {
      const errMsg = ocrData.ErrorMessage || 'No parsed results';
      console.error('OCR failed:', errMsg);
      return res.status(400).json({ error: `OCR failed: ${errMsg}` });
    }
    const rawText = ocrData.ParsedResults[0].ParsedText;
    console.log('OCR raw text:', rawText);

    // ---------- 2. AI Document Understanding ----------
    const aiRes = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/ai/correct-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.json();
      return res.status(500).json({ error: 'AI correction failed: ' + (err.error || 'unknown') });
    }
    const { people } = await aiRes.json();
    console.log('AI returned', people.length, 'people');

    if (!people || people.length === 0) {
      return res.status(400).json({ error: 'No people found. Please ensure the register is clear.' });
    }

    // ---------- 3. Phone validation & cleanup ----------
    const validPeople = people
      .filter(p => p.name && p.name.trim().length > 0)
      .map(p => {
        let phone = (p.phone || '').replace(/\s+/g, '');
        // Validate Nigerian phone: must be 11-13 digits after country code
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) {
          phone = ''; // invalid phone, don't use
        }
        return {
          first_name: p.name.trim(),
          last_name: '',
          phone: phone,
          confidence: p.confidence || 70,
        };
      });
    console.log('Valid people after phone validation:', validPeople.length);

    if (validPeople.length === 0) {
      return res.status(400).json({ error: 'No valid names with phone numbers found.' });
    }

    // ---------- 4. Confidence split (80% threshold) ----------
    const HIGH_THRESHOLD = 80;
    const highConfidence = validPeople.filter(p => p.confidence >= HIGH_THRESHOLD);
    const lowConfidence = validPeople.filter(p => p.confidence < HIGH_THRESHOLD);
    console.log(`High confidence (>=${HIGH_THRESHOLD}): ${highConfidence.length}, Low: ${lowConfidence.length}`);

    // ---------- 5. Save high-confidence members ----------
    const client = await pool.connect();
    let presentIds = [];
    let newMembersCount = 0;

    if (highConfidence.length > 0) {
      const membersRes = await client.query(
        `SELECT id, first_name, last_name, phone FROM members WHERE church_id = $1 AND status = 'active'`,
        [churchId]
      );
      const membersList = membersRes.rows;
      const { presentIds: matched, unmatched } = matchNamesToMembers(highConfidence, membersList);
      presentIds = matched;
      console.log('Matched by name:', matched.length, 'Unmatched:', unmatched.length);

      for (const person of unmatched) {
        const fullName = person.first_name;
        if (!fullName) continue;
        let phone = person.phone || '';
        let memberId = null;

        // If phone exists, try to find an existing member with that phone first
        if (phone) {
          const existing = await client.query(
            `SELECT id FROM members WHERE church_id = $1 AND phone = $2 LIMIT 1`,
            [churchId, phone]
          );
          if (existing.rows.length > 0) {
            memberId = existing.rows[0].id;
            // Update the name to the corrected version
            await client.query(`UPDATE members SET first_name = $1, last_name = '' WHERE id = $2`, [fullName, memberId]);
            console.log(`Updated existing member ${fullName} (phone ${phone})`);
            presentIds.push(memberId);
            continue;
          }
        }

        // Insert new member
        try {
          const insertRes = await client.query(
            `INSERT INTO members (church_id, first_name, last_name, phone, status, type)
             VALUES ($1, $2, '', $3, 'active', 'visitor') RETURNING id`,
            [churchId, fullName, phone]
          );
          memberId = insertRes.rows[0].id;
          console.log(`Inserted ${fullName} (${phone}) with id ${memberId}`);
          newMembersCount++;
        } catch (insertErr) {
          console.error(`Insert error for ${fullName} (${phone}):`, insertErr.message);
          // If insert fails, try without phone (in case of constraint)
          if (phone) {
            try {
              const insertNoPhone = await client.query(
                `INSERT INTO members (church_id, first_name, last_name, phone, status, type)
                 VALUES ($1, $2, '', '', 'active', 'visitor') RETURNING id`,
                [churchId, fullName]
              );
              memberId = insertNoPhone.rows[0].id;
              console.log(`Inserted ${fullName} without phone, id ${memberId}`);
              newMembersCount++;
            } catch (secondErr) {
              console.error(`Second insert error for ${fullName}:`, secondErr.message);
              // Last resort: find by phone again (maybe we missed)
              if (phone) {
                const recheck = await client.query(
                  `SELECT id FROM members WHERE church_id = $1 AND phone = $2 LIMIT 1`,
                  [churchId, phone]
                );
                if (recheck.rows.length > 0) {
                  memberId = recheck.rows[0].id;
                  console.log(`Finally found by phone ${phone}, using id ${memberId}`);
                }
              }
            }
          }
        }

        if (memberId) {
          presentIds.push(memberId);
        } else {
          console.error(`Failed completely to add member: ${fullName}`);
        }
      }
    }

    console.log('Present IDs after insert:', presentIds.length);

    // ---------- 6. Record attendance ----------
    const today = new Date().toISOString().slice(0, 10);
    let sessionRes = await client.query(
      `SELECT id FROM sessions WHERE church_id = $1 AND name = $2 AND created_at::date = $3`,
      [churchId, programName, today]
    );
    let sessionId;
    if (sessionRes.rows.length === 0) {
      const newSession = await client.query(
        `INSERT INTO sessions (church_id, name, status) VALUES ($1, $2, 'active') RETURNING id`,
        [churchId, programName]
      );
      sessionId = newSession.rows[0].id;
      await client.query(`INSERT INTO session_sections (session_id, name) VALUES ($1, 'All')`, [sessionId]);
    } else {
      sessionId = sessionRes.rows[0].id;
    }
    const sectionRes = await client.query(
      `SELECT id FROM session_sections WHERE session_id = $1 AND name = 'All'`,
      [sessionId]
    );
    const sectionId = sectionRes.rows[0].id;

    for (const memberId of presentIds) {
      await client.query(
        `INSERT INTO attendance_records (member_id, attendance_date, present, session_section_id)
         VALUES ($1, $2, true, $3) ON CONFLICT (member_id, attendance_date) DO UPDATE SET present = true`,
        [memberId, today, sectionId]
      );
    }

    // Mark others absent
    const allActive = await client.query(
      `SELECT id FROM members WHERE church_id = $1 AND status = 'active'`,
      [churchId]
    );
    const allActiveIds = allActive.rows.map(r => r.id);
    for (const id of allActiveIds) {
      if (!presentIds.includes(id)) {
        await client.query(
          `INSERT INTO attendance_records (member_id, attendance_date, present, session_section_id)
           VALUES ($1, $2, false, $3) ON CONFLICT (member_id, attendance_date) DO NOTHING`,
          [id, today, sectionId]
        );
      }
    }

    client.release();

    // ---------- 7. Store low-confidence entries for review ----------
    const validLow = lowConfidence.filter(p => p.first_name?.trim());
    if (validLow.length > 0) {
      const flatValues = [];
      const placeholders = validLow.map((p, i) => {
        const base = i * 6 + 1;
        flatValues.push(churchId, sessionId, p.first_name, '', p.phone || '', p.confidence);
        return `($${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5})`;
      }).join(', ');
      await pool.query(
        `INSERT INTO pending_reviews (church_id, session_id, first_name, last_name, phone, confidence)
         VALUES ${placeholders}`,
        flatValues
      );
    }

    const result = {
      status: 'ok',
      present_count: presentIds.length,
      absent_count: allActiveIds.length - presentIds.length,
      new_members: newMembersCount,
      pending_review: validLow.length,
    };
    console.log('Scan result:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Scan pipeline error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
