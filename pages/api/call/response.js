import { supabaseAdmin } from '../../../lib/supabaseClient';
import { detectIntent } from '../../../utils/intent';
import { generateReply } from '../../../utils/aiReply';   // new utility
import { notifyPastor } from '../../../utils/notify';     // new utility

const MAX_TURNS = 4;   // after 4 exchanges, end call
const TIME_WARNING = 150; // seconds – if we're near limit, warn and end

export default async function handler(req, res) {
  const memberId = req.query.member_id;
  const turn = parseInt(req.query.turn) || 1;
  const speechResult = req.body.SpeechResult || '';
  const callSid = req.body.CallSid;

  // 1. Get member info
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('first_name, last_name, phone')
    .eq('id', memberId)
    .single();

  // 2. Detect intent from speech (free keyword + later LLM fallback)
  let intent = detectIntent(speechResult, null);

  // 3. Update follow‑up log with intent if not already set
  const { data: logs } = await supabaseAdmin
    .from('follow_up_logs')
    .select('id')
    .eq('member_id', memberId)
    .eq('call_sid', callSid)
    .limit(1);
  if (logs?.length) {
    await supabaseAdmin.from('follow_up_logs').update({ intent_detected: intent }).eq('id', logs[0].id);
  }

  // 4. If intent is urgent, notify pastor immediately
  if (['prayer_request', 'visit_request', 'sick', 'relocated'].includes(intent)) {
    await notifyPastor(member, intent);
  }

  // 5. Generate AI reply using OpenAI (or rule‑based fallback)
  let replyText;
  if (intent === 'no_response') {
    replyText = `I didn't quite catch that. Could you repeat?`;
  } else {
    // Use LLM to form a natural, empathetic reply
    replyText = await generateReply(member.first_name, speechResult, intent, turn);
  }

  // 6. Build TwiML for next turn (or final)
  let twiml;
  if (turn >= MAX_TURNS) {
    // End politely
    twiml = `
      <Response>
        <Say voice="Polly.Joanna">Thank you for speaking with us, ${member.first_name}. We’ll be in touch. God bless you.</Say>
        <Hangup/>
      </Response>`;
  } else {
    // Next gather
    twiml = `
      <Response>
        <Say voice="Polly.Joanna">${replyText}</Say>
        <Gather
          input="speech"
          action="/api/call/response?member_id=${memberId}&turn=${turn + 1}"
          timeout="5"
          speechTimeout="2"
          language="en-US"
        />
        <Say>Thank you. We'll reach out again soon. Goodbye.</Say>
      </Response>`;
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml);
                            }
