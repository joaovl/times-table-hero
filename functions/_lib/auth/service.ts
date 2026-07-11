import type { Db } from './types';
import { generateSessionToken, hashToken, sessionExpiry } from './tokens';
import { serializeSessionCookie } from './cookies';
import { createSession } from './repo';

const THIRTY_DAYS_SECONDS = 30 * 86_400;

export async function issueSession(
  db: Db,
  accountId: string,
  now: Date,
): Promise<{ token: string; cookie: string }> {
  const token = generateSessionToken();
  await createSession(db, {
    tokenHash: await hashToken(token),
    accountId,
    expiresAt: sessionExpiry(now, 30),
    createdAt: now.toISOString(),
  });
  return { token, cookie: serializeSessionCookie(token, THIRTY_DAYS_SECONDS) };
}
