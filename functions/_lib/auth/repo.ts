import type { Db, Account } from './types';

interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  tz_offset_min: number;
  created_at: string;
  pairing_pin_hash: string | null;
  pairing_pin_salt: string | null;
}

function mapAccount(r: AccountRow | null): Account | null {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    salt: r.salt,
    tzOffsetMin: r.tz_offset_min,
    createdAt: r.created_at,
    pairingPinHash: r.pairing_pin_hash ?? null,
    pairingPinSalt: r.pairing_pin_salt ?? null,
  };
}

export async function createAccount(
  db: Db,
  a: {
    id: string;
    email: string;
    passwordHash: string;
    salt: string;
    tzOffsetMin: number;
    createdAt: string;
    pairingPinHash?: string | null;
    pairingPinSalt?: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO accounts (id,email,password_hash,salt,tz_offset_min,created_at,pairing_pin_hash,pairing_pin_salt) VALUES (?,?,?,?,?,?,?,?)',
    )
    .bind(a.id, a.email, a.passwordHash, a.salt, a.tzOffsetMin, a.createdAt, a.pairingPinHash ?? null, a.pairingPinSalt ?? null)
    .run();
}

export async function findAccountByEmail(db: Db, email: string): Promise<Account | null> {
  const row = await db.prepare('SELECT * FROM accounts WHERE email = ?').bind(email).first<AccountRow>();
  return mapAccount(row);
}

export async function getAccountById(db: Db, id: string): Promise<Account | null> {
  const row = await db.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first<AccountRow>();
  return mapAccount(row);
}

export async function createSession(
  db: Db,
  s: { tokenHash: string; accountId: string; expiresAt: string; createdAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO auth_sessions (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)')
    .bind(s.tokenHash, s.accountId, s.expiresAt, s.createdAt)
    .run();
}

export async function findAccountBySessionHash(
  db: Db,
  tokenHash: string,
  nowIso: string,
): Promise<Account | null> {
  const row = await db
    .prepare(
      `SELECT a.* FROM accounts a
       JOIN auth_sessions s ON s.account_id = a.id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, nowIso)
    .first<AccountRow>();
  return mapAccount(row);
}

export async function deleteSession(db: Db, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
}
