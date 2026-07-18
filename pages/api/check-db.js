import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const result = await pool.query('SELECT count(*) FROM members');
    return res.status(200).json({
      message: 'DB connected',
      count: result.rows[0].count,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
