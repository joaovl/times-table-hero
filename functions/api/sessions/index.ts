import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { authenticateKid } from '../../_lib/auth/kidsession';
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
  // The request body is consumed once and shared by both auth paths below.
  const body = await readJson<{ kidId?: string; sessions?: unknown }>(ctx.request);
  const sessionsValid = !!body && Array.isArray(body.sessions) && body.sessions.every(validSession);

  // Kid session path: a signed-in kid logs its OWN practice. It may omit kidId,
  // but a body kidId that differs from the session's kid is rejected — a kid
  // session can never write another kid's practice.
  const kidSession = await authenticateKid(ctx.request, ctx.env.DB, new Date());
  if (kidSession) {
    if (!sessionsValid) return error(400, 'invalid_input');
    if (typeof body!.kidId === 'string' && body!.kidId !== kidSession.kidId) {
      return error(400, 'kid_mismatch');
    }
    const inserted = await insertSessions(ctx.env.DB, kidSession.kidId, body!.sessions as SessionInput[]);
    return json({ inserted }, { status: 201 });
  }

  // Parent session path (unchanged): a signed-in parent logs practice for one of
  // their kids, identified by body.kidId.
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  if (!body || typeof body.kidId !== 'string' || !sessionsValid) {
    return error(400, 'invalid_input');
  }
  if (!(await getKid(ctx.env.DB, account.id, body.kidId))) {
    return error(404, 'kid_not_found');
  }

  const inserted = await insertSessions(ctx.env.DB, body.kidId, body.sessions as SessionInput[]);
  return json({ inserted }, { status: 201 });
}
