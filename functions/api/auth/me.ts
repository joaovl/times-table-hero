import type { Env } from '../../_lib/auth/types';
import { json, error } from '../../_lib/http';
import { authenticate } from '../../_lib/auth/authenticate';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await authenticate(ctx.request, ctx.env.DB, new Date());
  if (!account) return error(401, 'unauthorized');
  return json({ account: { id: account.id, email: account.email } });
}
