import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { listDevicePairings } from '../../_lib/auth/pairing';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ devices: await listDevicePairings(ctx.env.DB, account.id) });
}
