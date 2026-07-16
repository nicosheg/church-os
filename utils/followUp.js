import { supabaseAdmin } from '../lib/supabaseClient';
import { placeAiCall } from './twilio';

export async function processAbsentees(churchId, attendanceDate) {
  // 1. Get all absent records for that date (present=false) with active members
  const { data: absentRecords, error } = await supabaseAdmin
    .from('attendance_records')
    .select('member_id, members!inner( id, first_name, last_name, phone, status )')
    .eq('attendance_date', attendanceDate)
    .eq('present', false)
    .eq('members.status', 'active')
    .not('members.phone', 'is', null);

  if (error || !absentRecords) return;

  for (const record of absentRecords) {
    const member = record.members;
    // Check last 4 weeks attendance
    const dates = [];
    for (let i = 1; i <= 4; i++) {
      const d = new Date(attendanceDate);
      d.setDate(d.getDate() - 7 * i);
      dates.push(d.toISOString().slice(0,10));
    }
    const { data: recent } = await supabaseAdmin
      .from('attendance_records')
      .select('present')
      .in('attendance_date', dates)
      .eq('member_id', member.id)
      .order('attendance_date', { ascending: false });

    let consecAbsences = 0;
    for (const r of (recent || [])) {
      if (!r.present) consecAbsences++;
      else break;
    }

    if (consecAbsences === 0) {
      // First absence – send free WhatsApp via Twilio (if configured) – otherwise just log
      console.log(`WhatsApp to ${member.first_name}: We missed you!`);
      // Could insert a follow_up_log with 'whatsapp_sent' 
    } else if (consecAbsences === 1) {
      // Second absence: place AI call (free trial credit)
      await placeAiCall(member);
    } else if (consecAbsences === 2) {
      // Third absence: AI call with pastor escalation flag
      await placeAiCall(member, true);
    } else {
      // Fourth+ absence: escalate to pastor directly
      await supabaseAdmin.from('follow_up_logs').insert({
        member_id: member.id,
        call_status: 'escalated',
        intent_detected: 'chronic_absence',
        priority: 'high',
        notes: 'Escalated to pastor'
      });
    }
  }
  }
