import pool from '../../../lib/db';
import { initiateFollowUpCall } from '../../../utils/telephony';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { session_id } = req.body;

  const client = await pool.connect();
  try {
    // Mark session as closed
    await client.query('UPDATE sessions SET status = $1 WHERE id = $2', ['closed', session_id]);

    // Get all attendance records for today's session
    const today = new Date().toISOString().slice(0,10);
    const attendance = await client.query(
      `SELECT m.id AS member_id, m.first_name, m.phone, m.status AS member_status,
              ar.present
       FROM members m
       LEFT JOIN attendance_records ar ON m.id = ar.member_id AND ar.attendance_date = $1
       WHERE m.church_id = 'demo-church' AND m.status != 'deleted'`,
      [today]
    );

    // Get previous 4 weeks attendance for absent classification
    const weeks = [];
    for (let i = 1; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() - 7*i);
      weeks.push(d.toISOString().slice(0,10));
    }

    for (const member of attendance.rows) {
      if (member.present) continue; // skip present

      // Determine category
      let category = 'first_absence';
      // TODO: implement logic using previous attendance to set 'second_absence', 'returning', etc.
      // For demo, simply use 'first_absence'

      // Fetch template for that category
      const tmplRes = await client.query(
        'SELECT body FROM message_templates WHERE church_id = $1 AND category = $2',
        ['demo-church', category]
      );
      const template = tmplRes.rows[0]?.body || 'Hello {first_name}, we missed you.';
      const message = template.replace('{first_name}', member.first_name);

      // Send via WhatsApp bridge (which uses church's own number)
      await initiateFollowUpCall({ phone: member.phone, first_name: member.first_name }, false, message);
      // Note: we modified initiateFollowUpCall to accept optional message override
    }

    res.json({ success: true, processed: attendance.rows.filter(r => !r.present).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
  }
