export default async function handler(req, res) {
  const phone = req.query.phone;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  try {
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || 'http://whatsapp-bridge:3001';
    const response = await fetch(`${bridgeUrl}/pairing-code?phone=${encodeURIComponent(phone)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
