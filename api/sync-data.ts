import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (req.headers['x-supabase-url'] as string);
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (req.headers['x-supabase-key'] as string);

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      configured: false,
      message:
        'Supabase cloud credentials are not configured yet. To enable automated cross-device cloud synchronization, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings.',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'GET') {
      const [{ data: accounts }, { data: categories }, { data: transactions }] =
        await Promise.all([
          supabase.from('accounts').select('*').order('created_at', { ascending: true }),
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase
            .from('transactions')
            .select('*, category:categories(*), account:accounts(*), to_account:accounts(*)')
            .order('date', { ascending: false }),
        ]);

      return res.status(200).json({
        configured: true,
        accounts: accounts || [],
        categories: categories || [],
        transactions: transactions || [],
      });
    }

    return res.status(200).json({
      configured: true,
      status: 'Cloud sync endpoint is active and listening.',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Database sync failed',
    });
  }
}
