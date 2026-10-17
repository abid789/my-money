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

    // Require and verify Authorization Bearer token to protect private financial data
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication token is required to access financial data.',
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired authentication session. Please sign in.',
      });
    }

    if (req.method === 'GET') {
      const [{ data: accounts }, { data: categories }, { data: transactions }] =
        await Promise.all([
          supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('transactions')
            .select('*, category:categories(*), account:accounts(*), to_account:accounts(*)')
            .eq('user_id', user.id)
            .order('date', { ascending: false }),
        ]);

      return res.status(200).json({
        configured: true,
        user_id: user.id,
        accounts: accounts || [],
        categories: categories || [],
        transactions: transactions || [],
      });
    }

    return res.status(200).json({
      configured: true,
      status: 'Cloud sync endpoint is active and authenticated.',
      user_id: user.id,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Database sync failed',
    });
  }
}
