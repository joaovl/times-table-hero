import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { getKid } from '../../_lib/kids/repo';
import { insertSessions, type SessionInput } from '../../_lib/sessions/repo';

function validSession(v: unknown): v is SessionInput {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.startedAt === 'string' &&
    typeof s.endedAt === 'string' &&
    typeof s.durationSec === 'number' &&
    typeof s.module === 'string' &&
    typeof s.correct === 'number' &&
    typeof s.total === 'number' &&
    Array.isArray(s.topics)
  );
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const body = await readJson<{ kidId?: string; sessions?: unknown }>(ctx.request);
  if (!body || typeof body.kidId !== 'string' || !Array.isArray(body.sessions) || !body.sessions.every(validSession)) {
    return error(400, 'invalid_input');
  }
  if (!(await getKid(ctx.env.DB, account.id, body.kidId))) {
    return error(404, 'kid_not_found');
  }

  const inserted = await insertSessions(ctx.env.DB, body.kidId, body.sessions as SessionInput[]);
  return json({ inserted }, { status: 201 });
}
