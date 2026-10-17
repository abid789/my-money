import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  verifyMasterPassword,
  issueSessionToken,
  hashPassword,
  saveNewPasswordHash,
} from '../_auth';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, password, oldPassword, newPassword } = req.body || {};

    // Change password action
    if (action === 'change_password') {
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old password and new password are required' });
      }

      const isOldValid = await verifyMasterPassword(oldPassword);
      if (!isOldValid) {
        return res.status(401).json({ error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়' });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
      }

      const newHash = hashPassword(newPassword);
      await saveNewPasswordHash(newHash);
      const newToken = issueSessionToken('master-owner');

      return res.status(200).json({
        success: true,
        message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে',
        token: newToken,
      });
    }

    // Default: Login with password
    if (!password) {
      return res.status(400).json({ error: 'পাসওয়ার্ড প্রদান করুন' });
    }

    const isValid = await verifyMasterPassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।',
      });
    }

    const token = issueSessionToken('master-owner');

    return res.status(200).json({
      success: true,
      message: 'লগইন সফল হয়েছে',
      token,
      user: {
        id: 'master-owner',
        name: 'Master Account',
        role: 'owner',
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Authentication error',
    });
  }
}
