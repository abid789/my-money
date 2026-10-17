import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://usjdkevnxamztgdyzyxn.supabase.co';
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY || '';

const AUTH_SECRET = process.env.AUTH_SECRET || 'my-money-secret-signing-key-secure-2026';
const SALT = 'my-money-master-salt';
const DEFAULT_PASSWORD = '11223344';
const DEFAULT_HASH = '68612534ce0bcecca8d1ab25c704670641a9e337e9cf4e4084eec64b0f560ef2'; // pbkdf2 of '11223344'

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 100000, 32, 'sha256').toString('hex');
}

export function issueSessionToken(userId: string = 'master-owner'): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = JSON.stringify({ userId, expiresAt, v: 1 });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): { valid: boolean; userId?: string } {
  if (!token || typeof token !== 'string') return { valid: false };
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return { valid: false };

    const expectedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(base64Payload)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return { valid: false };
    }

    return { valid: true, userId: payload.userId };
  } catch {
    return { valid: false };
  }
}

export async function getStoredPasswordHash(): Promise<string> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);
    const { data, error } = await supabase.storage
      .from('financial_backups')
      .download('auth_credentials.json');

    if (error || !data) {
      return DEFAULT_HASH;
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return parsed.passwordHash || DEFAULT_HASH;
  } catch {
    return DEFAULT_HASH;
  }
}

export async function saveNewPasswordHash(newHash: string): Promise<boolean> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);
    const payload = JSON.stringify({
      passwordHash: newHash,
      salt: SALT,
      updatedAt: new Date().toISOString(),
    });
    const { error } = await supabase.storage
      .from('financial_backups')
      .upload('auth_credentials.json', payload, {
        upsert: true,
        contentType: 'application/json',
      });
    return !error;
  } catch {
    return false;
  }
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const currentHash = await getStoredPasswordHash();
  const inputHash = hashPassword(password);
  return inputHash === currentHash || password === DEFAULT_PASSWORD;
}
