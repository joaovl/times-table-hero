import type { Db } from './types';
import { getRequestToken } from './cookies';
import { hashToken } from './tokens';

export async function createKidSession(
  db: Db, s: { tokenHash: string; kidId: string; accountId: string; createdAt: string; expiresAt: string },
): Promise<void> {
  await db.prepare(
    'INSERT INTO kid_sessions (token_hash, kid_id, account_id, created_at, expires_at) VALUES (?,?,?,?,?)',
  ).bind(s.tokenHash, s.kidId, s.accountId, s.createdAt, s.expiresAt).run();
}

export async function findKidSession(
  db: Db, tokenHash: string, now: Date,
): Promise<{ kidId: string; accountId: string } | null> {
  const row = await db.prepare(
    'SELECT kid_id, account_id, expires_at FROM kid_sessions WHERE token_hash = ?',
  ).bind(tokenHash).first<{ kid_id: string; account_id: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;
  return { kidId: row.kid_id, accountId: row.account_id };
}

export async function deleteKidSession(db: Db, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM kid_sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/** Authenticates a request carrying a kid-session token (Authorization: Bearer or session cookie). */
export async function authenticateKid(
  request: Request, db: Db, now: Date,
): Promise<{ kidId: string; accountId: string } | null> {
  const raw = getRequestToken(request);
  if (!raw) return null;
  return findKidSession(db, await hashToken(raw), now);
}
