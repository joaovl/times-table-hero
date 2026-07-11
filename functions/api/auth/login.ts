import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { normalizeEmail } from '../../_lib/auth/validation';
import { verifyPassword } from '../../_lib/auth/password';
import { findAccountByEmail } from '../../_lib/auth/repo';
import { issueSession } from '../../_lib/auth/service';
import { recordAndCheck } from '../../_lib/auth/rate-limit';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string }>(ctx.request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return error(401, 'invalid_credentials');
  }
  const email = normalizeEmail(body.email);

  const now = new Date();
  if ((await recordAndCheck(ctx.env.DB, email, now)).blocked) {
    return error(429, 'too_many_attempts');
  }

  const account = await findAccountByEmail(ctx.env.DB, email);
  if (!account || !(await verifyPassword(body.password, account.passwordHash, account.salt))) {
    return error(401, 'invalid_credentials');
  }
  const { token, cookie } = await issueSession(ctx.env.DB, account.id, now);
  return json({ token, account: { id: account.id, email: account.email } }, { headers: { 'Set-Cookie': cookie } });
}
