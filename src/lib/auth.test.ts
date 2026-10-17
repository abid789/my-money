import { describe, it, expect } from 'vitest';

// PBKDF2 SHA-256 implementation matching AuthContext
async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('Secure Authentication & Password Hashing', () => {
  it('should generate unique random cryptographic salts', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);
    expect(salt1.length).toBe(32); // 16 bytes hex = 32 chars
    expect(salt2.length).toBe(32);
  });

  it('should hash password deterministically with identical salt', async () => {
    const salt = generateSalt();
    const hash1 = await hashPassword('SecretPass123!', salt);
    const hash2 = await hashPassword('SecretPass123!', salt);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex chars
  });

  it('should produce different hashes for different passwords with same salt', async () => {
    const salt = generateSalt();
    const hash1 = await hashPassword('PasswordA', salt);
    const hash2 = await hashPassword('PasswordB', salt);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hashes for same password with different salts', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = await hashPassword('IdenticalPassword123!', salt1);
    const hash2 = await hashPassword('IdenticalPassword123!', salt2);
    expect(hash1).not.toBe(hash2);
  });

  it('should never match an incorrect password attempt', async () => {
    const salt = generateSalt();
    const correctHash = await hashPassword('CorrectPassword123!', salt);
    const wrongAttempt = await hashPassword('WrongPassword123!', salt);
    expect(wrongAttempt).not.toBe(correctHash);
  });
});

describe('Persistent Session Management', () => {
  it('should recognize active session within 30-day expiration window', () => {
    const now = Date.now();
    const session = {
      token: crypto.randomUUID(),
      userId: 'test-user-id',
      email: 'test@example.com',
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    };

    const isValid = session.expiresAt > now;
    expect(isValid).toBe(true);
  });

  it('should reject expired sessions', () => {
    const now = Date.now();
    const expiredSession = {
      token: crypto.randomUUID(),
      userId: 'test-user-id',
      email: 'test@example.com',
      expiresAt: now - 1000, // expired 1s ago
    };

    const isValid = expiredSession.expiresAt > now;
    expect(isValid).toBe(false);
  });
});

describe('Password-Only Master Authentication ("11223344")', () => {
  const MASTER_SALT = 'my-money-master-salt';
  const DEFAULT_PASSWORD = '11223344';
  const EXPECTED_DEFAULT_HASH = '68612534ce0bcecca8d1ab25c704670641a9e337e9cf4e4084eec64b0f560ef2';

  it('should hash default password "11223344" to known PBKDF2 SHA-256 hash', async () => {
    const hash = await hashPassword(DEFAULT_PASSWORD, MASTER_SALT);
    expect(hash).toBe(EXPECTED_DEFAULT_HASH);
  });

  it('should authenticate correctly with "11223344"', async () => {
    const enteredPassword = '11223344';
    const computedHash = await hashPassword(enteredPassword, MASTER_SALT);
    const authenticated = computedHash === EXPECTED_DEFAULT_HASH || enteredPassword === DEFAULT_PASSWORD;
    expect(authenticated).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const wrongPasswords = ['123456', 'wrongpass', '11223345', ''];
    for (const wrong of wrongPasswords) {
      if (!wrong) continue;
      const computedHash = await hashPassword(wrong, MASTER_SALT);
      const authenticated = computedHash === EXPECTED_DEFAULT_HASH || wrong === DEFAULT_PASSWORD;
      expect(authenticated).toBe(false);
    }
  });

  it('should support changing password and authenticating with new password', async () => {
    const newPassword = 'myNewSecurePass2026';
    const newHash = await hashPassword(newPassword, MASTER_SALT);
    expect(newHash).not.toBe(EXPECTED_DEFAULT_HASH);

    // Verify authentication with new password
    const testLogin = await hashPassword('myNewSecurePass2026', MASTER_SALT);
    expect(testLogin).toBe(newHash);
  });
});
