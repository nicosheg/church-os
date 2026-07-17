import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function notifyPastor(member, intent) {
  const pastorPhone = process.env.PASTOR_PHONE_NUMBER;
  if (!pastorPhone) return;

  const msg = `URGENT: ${member.first_name} ${member.last_name} (${member.phone}) reported "${intent}". Please follow up.`;
  await client.messages.create({
    body: msg,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: pastorPhone,
  });
}
