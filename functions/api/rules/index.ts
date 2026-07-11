import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { parseRewardRules } from '../../_lib/rules/validate';
import { upsertRules, listRules } from '../../_lib/rules/repo';
import { getKid } from '../../_lib/kids/repo';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ rules: await listRules(ctx.env.DB, account.id) });
}

export async function onRequestPut(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const body = await readJson<{ kidId?: string | null; rules?: unknown }>(ctx.request);
  const config = parseRewardRules(body?.rules);
  if (!config) return error(400, 'invalid_input');

  const kidId = body?.kidId ?? null;
  if (typeof kidId === 'string') {
    if (!(await getKid(ctx.env.DB, account.id, kidId))) return error(404, 'kid_not_found');
  }

  await upsertRules(ctx.env.DB, account.id, kidId, config, new Date().toISOString());
  return json({ ok: true });
}
