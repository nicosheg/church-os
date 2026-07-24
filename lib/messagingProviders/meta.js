const token = process.env.META_ACCESS_TOKEN;
const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

function sanitise(str) {
  if (!str) return '';
  return str.replace(/[\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g, '').trim();
}

export async function sendMessage(phone, message) {
  const cleanToken = sanitise(token);
  const cleanPhone = sanitise(phone).replace(/^\+/, '');
  const cleanMessage = sanitise(message);

  if (!cleanToken || !phoneNumberId) {
    throw new Error('Missing Meta credentials');
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: cleanMessage },
      }),
    }
  );

  const data = await response.json();
  if (!data.messages) {
    throw new Error(data.error?.message || 'Unknown error');
  }
  return data.messages[0].id;
}
