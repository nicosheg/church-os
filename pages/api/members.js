import { supabaseAdmin } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const churchId = req.query.church_id || req.body?.church_id;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { first_name, last_name, phone, church_id } = req.body;
    const { data, error } = await supabaseAdmin
      .from('members')
      .insert({ first_name, last_name, phone, church_id, status: 'active' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.status(405).end();
}
