import { supabaseAdmin } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const churchId = req.query.church_id || 'demo-church';
  const today = new Date().toISOString().slice(0,10);

  const { data, error } = await supabaseAdmin
    .rpc('get_dashboard_stats', { _church_id: churchId, _today: today });
    // We'll create a database function or just run raw SQL
  if (error) return res.status(500).json({ error: error.message });

  // Fallback: raw query if RPC not defined
  const { data: result } = await supabaseAdmin
    .from('attendance_records')
    .select(`
      attendance_date,
      member_id,
      present,
      members!inner ( church_id ),
      follow_up_logs ( id, intent_detected, priority, call_status )
    `, { count: 'exact' })
    .eq('members.church_id', churchId)
    .eq('attendance_date', today);

  // Manual calculation for MVP
  let presentCount = 0, absentCount = 0, callsCompleted = 0, prayerRequests = 0, needsPastor = 0, wrongNumbers = 0;
  const seenMembers = new Set();
  (result || []).forEach(rec => {
    if (seenMembers.has(rec.member_id)) return;
    seenMembers.add(rec.member_id);
    if (rec.present) presentCount++; else absentCount++;
    (rec.follow_up_logs || []).forEach(log => {
      if (log.call_status === 'completed') callsCompleted++;
      if (log.intent_detected === 'prayer_request') prayerRequests++;
      if (log.priority === 'high') needsPastor++;
      if (log.call_status === 'failed') wrongNumbers++;
    });
  });

  res.json({
    attendance_date: today,
    present_count: presentCount,
    absent_count: absentCount,
    calls_completed: callsCompleted,
    prayer_requests: prayerRequests,
    needs_pastor: needsPastor,
    wrong_numbers: wrongNumbers,
  });
          }
