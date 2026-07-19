export async function placeCall(member, escalate = false, customMessage = null) {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';
  const message = customMessage || `⛪ *Havilah Christian Church* \n\nHello ${member.first_name}, we missed you at service today. Have a blessed week! 🙏`;

  const res = await fetch(`${bridgeUrl}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: member.phone, message })
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Bridge error');
  return data;
}
