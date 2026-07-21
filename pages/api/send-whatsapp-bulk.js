import pool from '../../lib/db';
import { sendWhatsAppMessage } from '../../lib/messagingProviders';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { church_id, session_name, message_template } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Fetch present members with phone numbers
    let query = `
      SELECT DISTINCT m.id, m.first_name, m.phone
      FROM members m
      JOIN attendance_records ar ON m.id = ar.member_id
      WHERE m.church_id = $1 AND ar.attendance_date = $2 AND ar.present = true
        AND m.phone IS NOT NULL AND m.phone != ''
    `;
    const params = [church_id || 'demo-church', today];

    if (session_name) {
      query += ` AND ar.session_section_id IN (
        SELECT id FROM session_sections WHERE session_id IN (
          SELECT id FROM sessions WHERE name = $3 AND church_id = $1 AND created_at::date = $2
        )
      )`;
      params.push(session_name);
    }

    const { rows: members } = await pool.query(query, params);
    if (members.length === 0) {
      return res.status(200).json({ message: 'No phone numbers found for this session.' });
    }

    const results = [];
    const defaultTemplate = 'Hello {first_name}, thank you for being part of our community. 🙏';
    const footer = '\n\n✨ Intelligence by FIDUCIA';

    for (const member of members) {
      let msg = (message_template || defaultTemplate)
        .replace('{first_name}', member.first_name)
        .replace('{session}', session_name || 'our program');
      msg += footer;

      try {
        await sendWhatsAppMessage(member.phone, msg);
        results.push({ phone: member.phone, status: 'sent' });
      } catch (err) {
        results.push({ phone: member.phone, error: err.message, status: 'failed' });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return res.status(200).json({ sent, failed, results });
  } catch (error) {
    console.error('Bulk WhatsApp error:', error);
    return res.status(500).json({ error: error.message });
  }
}
