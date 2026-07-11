import type { Account, Db } from './types';
import { authenticate } from './authenticate';
import { error } from '../http';

/** Returns the authenticated account, or a 401 Response to return directly. */
export async function requireAccount(request: Request, db: Db): Promise<Account | Response> {
  const account = await authenticate(request, db, new Date());
  return account ?? error(401, 'unauthorized');
}
