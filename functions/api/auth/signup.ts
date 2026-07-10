import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { normalizeEmail, isValidEmail, isValidPassword } from '../../_lib/auth/validation';
import { hashPassword } from '../../_lib/auth/password';
import { createAccount, findAccountByEmail } from '../../_lib/auth/repo';
import { issueSession } from '../../_lib/auth/service';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string; tzOffsetMin?: number }>(ctx.request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return error(400, 'invalid_input');
  }
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email) || !isValidPassword(body.password)) {
    return error(400, 'invalid_input');
  }
  if (await findAccountByEmail(ctx.env.DB, email)) {
    return error(409, 'email_taken');
  }

  const now = new Date();
  const { hash, salt } = await hashPassword(body.password);
  const id = crypto.randomUUID();
  await createAccount(ctx.env.DB, {
    id, email, passwordHash: hash, salt,
    tzOffsetMin: typeof body.tzOffsetMin === 'number' ? body.tzOffsetMin : 0,
    createdAt: now.toISOString(),
  });

  const { token, cookie } = await issueSession(ctx.env.DB, id, now);
  return json({ token, account: { id, email } }, { status: 201, headers: { 'Set-Cookie': cookie } });
}
