import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { authenticate } from '../../_lib/auth/authenticate';
import { findAccountByEmail } from '../../_lib/auth/repo';
import { verifyPassword } from '../../_lib/auth/password';
import { isValidPin, normalizeEmail } from '../../_lib/auth/validation';
import { generateSessionToken, hashToken, sessionExpiry } from '../../_lib/auth/tokens';
import { createDevicePairing } from '../../_lib/auth/pairing';
import { recordAndCheck } from '../../_lib/auth/rate-limit';

// Base64 of a zero-filled 32-byte hash / 16-byte salt, used to run a real
// PBKDF2 verify for unknown/no-pin accounts so response timing does not
// reveal whether the email (or its family PIN) exists (see login.ts).
const DUMMY_HASH = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';

type ResolveResult = { accountId: string } | { status: 401 } | { status: 429 };

// Resolve the account to pair with: Mode A (logged-in parent) or Mode B
// (email + family PIN, rate-limited).
async function resolveAccount(ctx: { request: Request; env: Env }, now: Date): Promise<ResolveResult> {
  const account = await authenticate(ctx.request, ctx.env.DB, now); // Mode A
  if (account) return { accountId: account.id };

  const body = await readJson<{ email?: string; pin?: string }>(ctx.request); // Mode B
  if (!body || typeof body.email !== 'string' || typeof body.pin !== 'string' || !isValidPin(body.pin)) {
    return { status: 401 };
  }
  const email = normalizeEmail(body.email);

  if ((await recordAndCheck(ctx.env.DB, email, now)).blocked) {
    return { status: 429 };
  }

  const acct = await findAccountByEmail(ctx.env.DB, email);
  // Always run a full PBKDF2 verify — against a dummy hash when the account
  // or its family PIN is missing — so response time does not reveal whether
  // the email exists or has a PIN set (timing-based account enumeration).
  const pinOk = await verifyPassword(
    body.pin,
    acct?.pairingPinHash ?? DUMMY_HASH,
    acct?.pairingPinSalt ?? DUMMY_SALT,
  );
  if (!acct || !acct.pairingPinHash || !acct.pairingPinSalt || !pinOk) {
    return { status: 401 };
  }
  return { accountId: acct.id };
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const now = new Date();
  const resolved = await resolveAccount(ctx, now);
  if ('status' in resolved) {
    return resolved.status === 429 ? error(429, 'too_many_attempts') : error(401, 'unauthorized');
  }

  const token = generateSessionToken();
  await createDevicePairing(ctx.env.DB, {
    tokenHash: await hashToken(token),
    accountId: resolved.accountId,
    label: ctx.request.headers.get('user-agent')?.slice(0, 120) ?? null,
    createdAt: now.toISOString(),
    expiresAt: sessionExpiry(now, 180),
  });
  return json({ token });
}
