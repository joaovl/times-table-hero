import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { deleteKid } from '../../_lib/kids/repo';

export async function onRequestDelete(ctx: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  await deleteKid(ctx.env.DB, account.id, ctx.params.id);
  return json({ ok: true });
}
