import crypto from 'crypto';

const DEFAULT_ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'blogsite2026';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`${DEFAULT_ADMIN_USER}:${DEFAULT_ADMIN_PASS}:fieldnote`).digest('hex');

export interface AdminSessionPayload {
  username: string;
  role: 'admin';
  exp: number;
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const userMatch = username.trim() === DEFAULT_ADMIN_USER;
  const expectedBuf = Buffer.from(DEFAULT_ADMIN_PASS, 'utf8');
  const providedBuf = Buffer.from(password, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return userMatch && crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function signAdminToken(username: string): string {
  const payload: AdminSessionPayload = {
    username,
    role: 'admin',
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string): AdminSessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getDemoAdminUsername(): string {
  return DEFAULT_ADMIN_USER;
}
