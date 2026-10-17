import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionToken } from '../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false, error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { valid, userId } = verifySessionToken(token);

  if (!valid) {
    return res.status(401).json({ authenticated: false, error: 'Invalid or expired session' });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      id: userId || 'master-owner',
      name: 'Master Account',
      role: 'owner',
    },
  });
}
