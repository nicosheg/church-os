export default function handler(req, res) {
  res.json({
    message: 'Scan API directory exists',
    nodeVersion: process.version,
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
}
