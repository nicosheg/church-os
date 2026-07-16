import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function placeAiCall(member, escalate = false) {
  const twiml = `
    <Response>
      <Say voice="Polly.Joanna">
        Hello ${member.first_name}, this is Grace from your church. We missed seeing you recently and just wanted to check on you.
      </Say>
      <Gather input="speech dtmf" numDigits="1" action="/api/call/response?member_id=${member.id}" timeout="5">
        <Say>If you would like us to pray with you, press 1. If you would like a visit, press 2.</Say>
      </Gather>
      <Say>Thank you, and God bless you. We look forward to seeing you soon.</Say>
    </Response>
  `;

  const call = await client.calls.create({
    twiml,
    to: member.phone,
    from: process.env.TWILIO_PHONE_NUMBER,
    statusCallback: `/api/call/status?member_id=${member.id}`,
    statusCallbackEvent: ['completed'],
  });

  // Log the call initiation
  await supabaseAdmin.from('follow_up_logs').insert({
    member_id: member.id,
    call_sid: call.sid,
    call_status: 'initiated',
    priority: escalate ? 'high' : 'medium',
  });

  return call.sid;
    }
