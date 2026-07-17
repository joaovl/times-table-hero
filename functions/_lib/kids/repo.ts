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
  k: {
    id: string;
    accountId: string;
    name: string;
    color: string;
    icon: string;
    createdAt: string;
    pin?: { hash: string; salt: string } | null;
  },
): Promise<void> {
  await db
    .prepare('INSERT INTO kids (id,account_id,name,color,icon,created_at,pin_hash,pin_salt) VALUES (?,?,?,?,?,?,?,?)')
    .bind(k.id, k.accountId, k.name, k.color, k.icon, k.createdAt, k.pin?.hash ?? null, k.pin?.salt ?? null)
    .run();
}

export async function updateKid(
  db: Db,
  accountId: string,
  id: string,
  patch: { name: string; color: string; icon: string; pin?: { hash: string; salt: string } | null },
): Promise<void> {
  if (patch.pin) {
    await db
      .prepare('UPDATE kids SET name = ?, color = ?, icon = ?, pin_hash = ?, pin_salt = ? WHERE account_id = ? AND id = ?')
      .bind(patch.name, patch.color, patch.icon, patch.pin.hash, patch.pin.salt, accountId, id)
      .run();
  } else {
    await db
      .prepare('UPDATE kids SET name = ?, color = ?, icon = ? WHERE account_id = ? AND id = ?')
      .bind(patch.name, patch.color, patch.icon, accountId, id)
      .run();
  }
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
