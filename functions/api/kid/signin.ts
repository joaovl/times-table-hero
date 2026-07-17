import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireDevicePairing } from '../../_lib/auth/guard';
import { getKidWithPin } from '../../_lib/kids/repo';
import { verifyPassword } from '../../_lib/auth/password';
import { isValidPin } from '../../_lib/auth/validation';
import { generateSessionToken, hashToken, sessionExpiry } from '../../_lib/auth/tokens';
import { createKidSession } from '../../_lib/auth/kidsession';
import { recordAndCheck } from '../../_lib/auth/rate-limit';

// Base64 of a zero-filled 32-byte hash / 16-byte salt, used to run a real
// PBKDF2 verify for unknown/no-pin kids so response timing does not reveal
// whether the kid exists or has a PIN set (see pair/index.ts, login.ts).
const DUMMY_HASH = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const p = await requireDevicePairing(ctx.request, ctx.env.DB);
  if (p instanceof Response) return p;

  const body = await readJson<{ kidId?: string; pin?: string }>(ctx.request);
  if (!body || typeof body.kidId !== 'string' || typeof body.pin !== 'string' || !isValidPin(body.pin)) {
    return error(401, 'unauthorized');
  }

  const now = new Date();
  // Separate rate-limit bucket per (account, kid) so guessing one kid's PIN
  // doesn't consume/block attempts against another kid on the same device.
  if ((await recordAndCheck(ctx.env.DB, `kidsignin:${p.accountId}:${body.kidId}`, now)).blocked) {
    return error(429, 'too_many_attempts');
  }

  // Account-scoped: returns null for a kid that doesn't exist or belongs to
  // a different account, so cross-account kid IDs can't be enumerated.
  const kid = await getKidWithPin(ctx.env.DB, p.accountId, body.kidId);

  // Always run a full PBKDF2 verify — against a dummy hash when the kid or
  // its PIN is missing — so response time does not reveal whether the kid
  // exists or has a PIN set (timing-based enumeration).
  const ok = await verifyPassword(body.pin, kid?.pinHash ?? DUMMY_HASH, kid?.pinSalt ?? DUMMY_SALT);
  if (!kid || !kid.pinHash || !kid.pinSalt || !ok) {
    return error(401, 'unauthorized');
  }

  const token = generateSessionToken();
  await createKidSession(ctx.env.DB, {
    tokenHash: await hashToken(token),
    kidId: kid.id,
    accountId: p.accountId,
    createdAt: now.toISOString(),
    expiresAt: sessionExpiry(now, 30),
  });
  return json({ token });
}
