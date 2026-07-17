import type { Account, Db } from './types';
import { authenticate } from './authenticate';
import { authenticatePairing } from './pairing';
import { authenticateKid } from './kidsession';
import { error } from '../http';

/** Returns the authenticated account, or a 401 Response to return directly. */
export async function requireAccount(request: Request, db: Db): Promise<Account | Response> {
  const account = await authenticate(request, db, new Date());
  return account ?? error(401, 'unauthorized');
}

/** Returns the paired account, or a 401 Response to return directly. Accepts only device-pairing tokens (disjoint from session tokens). */
export async function requireDevicePairing(request: Request, db: Db): Promise<{ accountId: string } | Response> {
  const pairing = await authenticatePairing(request, db, new Date());
  return pairing ?? error(401, 'unauthorized');
}

/** Returns the authenticated kid, or a 401 Response to return directly. Accepts only kid-session tokens (disjoint from account session/pairing tokens). */
export async function requireKid(request: Request, db: Db): Promise<{ kidId: string; accountId: string } | Response> {
  const k = await authenticateKid(request, db, new Date());
  return k ?? error(401, 'unauthorized');
}
