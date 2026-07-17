import type { Db } from './types';

export async function createDevicePairing(
  db: Db,
  p: { tokenHash: string; accountId: string; label: string | null; createdAt: string; expiresAt: string },
): Promise<void> {
  await db.prepare(
    'INSERT INTO device_pairings (token_hash, account_id, label, created_at, expires_at) VALUES (?,?,?,?,?)',
  ).bind(p.tokenHash, p.accountId, p.label, p.createdAt, p.expiresAt).run();
}

export async function findDevicePairing(
  db: Db, tokenHash: string, now: Date,
): Promise<{ accountId: string } | null> {
  const row = await db.prepare(
    'SELECT account_id, expires_at FROM device_pairings WHERE token_hash = ?',
  ).bind(tokenHash).first<{ account_id: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;
  return { accountId: row.account_id };
}

export async function deleteDevicePairing(db: Db, tokenHash: string, accountId: string): Promise<void> {
  await db.prepare('DELETE FROM device_pairings WHERE token_hash = ? AND account_id = ?')
    .bind(tokenHash, accountId).run();
}

export async function listDevicePairings(
  db: Db, accountId: string,
): Promise<{ tokenHashPrefix: string; label: string | null; createdAt: string; expiresAt: string }[]> {
  const { results } = await db.prepare(
    'SELECT token_hash, label, created_at, expires_at FROM device_pairings WHERE account_id = ? ORDER BY created_at DESC',
  ).bind(accountId).all<{ token_hash: string; label: string | null; created_at: string; expires_at: string }>();
  return results.map(r => ({ tokenHashPrefix: r.token_hash.slice(0, 8), label: r.label, createdAt: r.created_at, expiresAt: r.expires_at }));
}
