import type { Db } from '../auth/types';
import type { Kid } from './types';

interface KidRow {
  id: string;
  account_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

const map = (r: KidRow): Kid => ({
  id: r.id, accountId: r.account_id, name: r.name, color: r.color, icon: r.icon, createdAt: r.created_at,
});

export async function createKid(
  db: Db,
  k: { id: string; accountId: string; name: string; color: string; icon: string; createdAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO kids (id,account_id,name,color,icon,created_at) VALUES (?,?,?,?,?,?)')
    .bind(k.id, k.accountId, k.name, k.color, k.icon, k.createdAt)
    .run();
}

export async function listKids(db: Db, accountId: string): Promise<Kid[]> {
  const { results } = await db
    .prepare('SELECT * FROM kids WHERE account_id = ? ORDER BY created_at ASC')
    .bind(accountId)
    .all<KidRow>();
  return results.map(map);
}

export async function getKid(db: Db, accountId: string, id: string): Promise<Kid | null> {
  const row = await db
    .prepare('SELECT * FROM kids WHERE account_id = ? AND id = ?')
    .bind(accountId, id)
    .first<KidRow>();
  return row ? map(row) : null;
}

export async function deleteKid(db: Db, accountId: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM kids WHERE account_id = ? AND id = ?').bind(accountId, id).run();
}
