import pool from '../../lib/db';

export default async function handler(req, res) {
  const churchId = req.query.church_id || 'demo-church';
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Get all attendance records for today with member's church_id filter
    const attendanceResult = await pool.query(
      `SELECT ar.member_id, ar.present,
              m.id AS member_id, m.church_id
       FROM attendance_records ar
       JOIN members m ON ar.member_id = m.id
       WHERE m.church_id = $1 AND ar.attendance_date = $2`,
      [churchId, today]
    );

    // Get follow-up logs for today (using called_at date)
    const logsResult = await pool.query(
      `SELECT fl.member_id, fl.call_status, fl.intent_detected, fl.priority
       FROM follow_up_logs fl
       JOIN members m ON fl.member_id = m.id
       WHERE m.church_id = $1 AND fl.called_at::date = $2`,
      [churchId, today]
    );

    // Aggregate present/absent counts
    const attendanceRows = attendanceResult.rows;
    const presentCount = attendanceRows.filter(r => r.present).length;
    const absentCount = attendanceRows.filter(r => !r.present).length;

    // Aggregate follow-up stats
    const logs = logsResult.rows;
    const callsCompleted = logs.filter(l => l.call_status === 'completed').length;
    const prayerRequests = logs.filter(l => l.intent_detected === 'prayer_request').length;
    const needsPastor = logs.filter(l => l.priority === 'high').length;
    const wrongNumbers = logs.filter(l => l.call_status === 'failed').length;

    res.status(200).json({
      attendance_date: today,
      present_count: presentCount,
      absent_count: absentCount,
      calls_completed: callsCompleted,
      prayer_requests: prayerRequests,
      needs_pastor: needsPastor,
      wrong_numbers: wrongNumbers,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
}
