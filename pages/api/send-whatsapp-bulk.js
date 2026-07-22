import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { church_id } = req.body;
  const churchId = church_id || 'demo-church';

  try {
    // Get all active members with phone numbers
    const query = `
      SELECT DISTINCT m.id, m.first_name, m.phone
      FROM members m
      WHERE m.church_id = $1
        AND m.phone IS NOT NULL AND m.phone != ''
        AND m.status = 'active'
      ORDER BY m.first_name
    `;
    const { rows: members } = await pool.query(query, [churchId]);

    if (members.length === 0) {
      return res.status(200).json({ message: 'No members with phone numbers found.' });
    }

    // Template (you can later make this dynamic)
    const template = `⛪ *Havilah Christian Church*\n\nDear {first_name}, thank you for worshipping with us at GIBEON 2026! We appreciate you. Stay blessed! 🙏\n\n✨ Intelligence by FIDUCIA`;

    const links = members.map(member => {
      const personalized = template.replace('{first_name}', member.first_name);
      const phone = member.phone.startsWith('+') ? member.phone.substring(1) : member.phone;
      const encoded = encodeURIComponent(personalized);
      return {
        name: member.first_name,
        phone: member.phone,
        link: `https://wa.me/${phone}?text=${encoded}`,
      };
    });

    return res.status(200).json({ links });
  } catch (error) {
    console.error('Deep-link generation error:', error);
    return res.status(500).json({ error: error.message });
  }
        }
