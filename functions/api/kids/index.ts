import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { createKid, listKids } from '../../_lib/kids/repo';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ kids: await listKids(ctx.env.DB, account.id) });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const body = await readJson<{ name?: string; color?: string; icon?: string }>(ctx.request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const color = typeof body?.color === 'string' ? body.color : '';
  const icon = typeof body?.icon === 'string' ? body.icon : '';
  if (!name || name.length > 40 || !color || !icon) {
    return error(400, 'invalid_input');
  }

  const kid = { id: crypto.randomUUID(), accountId: account.id, name, color, icon, createdAt: new Date().toISOString() };
  await createKid(ctx.env.DB, kid);
  return json({ kid }, { status: 201 });
}
