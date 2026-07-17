import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { deleteKid, getKid, updateKid } from '../../_lib/kids/repo';
import { isValidPin } from '../../_lib/auth/validation';
import { hashPassword } from '../../_lib/auth/password';
import { serializeKid } from '../../_lib/kids/serialize';

export async function onRequestDelete(ctx: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  await deleteKid(ctx.env.DB, account.id, ctx.params.id);
  return json({ ok: true });
}

export async function onRequestPut(ctx: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const existing = await getKid(ctx.env.DB, account.id, ctx.params.id);
  if (!existing) return error(404, 'kid_not_found');

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

  await updateKid(ctx.env.DB, account.id, ctx.params.id, { name, color, icon, pin });
  const updated = { ...existing, name, color, icon };
  return json({ kid: serializeKid(updated) });
}
