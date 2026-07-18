import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { church_id, checkins } = req.body;  // checkins: array of { member_id, present, timestamp }
  const today = new Date().toISOString().slice(0, 10);

  // Upsert attendance records (present = true if in checkin)
  const records = checkins.map(c => ({
    member_id: c.member_id,
    attendance_date: today,
    present: c.present,
  }));

  const { error } = await supabaseAdmin
    .from('attendance_records')
    .upsert(records, { onConflict: 'member_id,attendance_date' });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
    }
