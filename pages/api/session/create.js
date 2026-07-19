import pool from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, sections, church_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Create session
    const sessionRes = await client.query(
      `INSERT INTO sessions (church_id, name, status) VALUES ($1, $2, 'active') RETURNING id`,
      [church_id, name]
    );
    const sessionId = sessionRes.rows[0].id;

    // Insert sections and their default members (if any)
    for (const secName of sections) {
      const secRes = await client.query(
        `INSERT INTO session_sections (session_id, name) VALUES ($1, $2) RETURNING id`,
        [sessionId, secName]
      );
      const sectionId = secRes.rows[0].id;
      // Optionally pre-load members already assigned to this section from the members table
      // For now, we'll leave it empty; ushers can search from the full members list
    }

    await client.query('COMMIT');
    res.status(200).json({ id: sessionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
      }
