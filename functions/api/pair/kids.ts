import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { requireDevicePairing } from '../../_lib/auth/guard';
import { listKids } from '../../_lib/kids/repo';
import { serializeKid } from '../../_lib/kids/serialize';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const p = await requireDevicePairing(ctx.request, ctx.env.DB);
  if (p instanceof Response) return p;
  const kids = await listKids(ctx.env.DB, p.accountId);
  return json({ kids: kids.map(serializeKid) });
}
