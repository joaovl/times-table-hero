import type { Db, Account } from './types';
import { getRequestToken } from './cookies';
import { hashToken } from './tokens';
import { findAccountBySessionHash } from './repo';

export async function authenticate(request: Request, db: Db, now: Date): Promise<Account | null> {
  const token = getRequestToken(request);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  return findAccountBySessionHash(db, tokenHash, now.toISOString());
}
