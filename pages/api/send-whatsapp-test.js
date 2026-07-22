import { sendWhatsAppMessage } from '../../lib/messagingProviders';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, first_name } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // Plain ASCII message – no emojis, no special characters
  const message = `Havilah Christian Church\n\nHello ${first_name || 'Beloved'}, this is a test message from FIDUCIA CARE.\n\nIntelligence by FIDUCIA`;

  try {
    await sendWhatsAppMessage(phone, message);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
