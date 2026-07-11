import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { getRequestToken, clearSessionCookie } from '../../_lib/auth/cookies';
import { hashToken } from '../../_lib/auth/tokens';
import { deleteSession } from '../../_lib/auth/repo';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const token = getRequestToken(ctx.request);
  if (token) {
    await deleteSession(ctx.env.DB, await hashToken(token));
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
