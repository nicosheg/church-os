import { sendWhatsAppMessage } from '../../lib/messagingProviders';

/**
 * Strip invisible Unicode characters that crash the browser.
 */
function sanitise(str) {
  if (!str) return '';
  return str.replace(/[\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, first_name } = req.body;
  const cleanPhone = sanitise(phone);
  if (!cleanPhone) return res.status(400).json({ error: 'Phone number required' });

  const message = `Havilah Christian Church\n\nHello ${sanitise(first_name) || 'Beloved'}, this is a test message from FIDUCIA CARE.\n\nIntelligence by FIDUCIA`;

  try {
    await sendWhatsAppMessage(cleanPhone, message);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
