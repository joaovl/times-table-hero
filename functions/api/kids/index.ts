import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { createKid, listKids } from '../../_lib/kids/repo';
import { isValidPin } from '../../_lib/auth/validation';
import { hashPassword } from '../../_lib/auth/password';
import { serializeKid } from '../../_lib/kids/serialize';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ kids: (await listKids(ctx.env.DB, account.id)).map(serializeKid) });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const body = await readJson<{ name?: string; color?: string; icon?: string; pin?: string }>(ctx.request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const color = typeof body?.color === 'string' ? body.color : '';
  const icon = typeof body?.icon === 'string' ? body.icon : '';
  if (!name || name.length > 40 || !color || !icon) {
    return error(400, 'invalid_input');
  }

  let pin: { hash: string; salt: string } | null = null;
  if (body?.pin !== undefined) {
    if (typeof body.pin !== 'string' || !isValidPin(body.pin)) return error(400, 'invalid_input');
    pin = await hashPassword(body.pin);
  }

  const kid = { id: crypto.randomUUID(), accountId: account.id, name, color, icon, createdAt: new Date().toISOString(), pin };
  await createKid(ctx.env.DB, kid);
  return json({ kid: serializeKid(kid) }, { status: 201 });
}
