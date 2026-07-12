import type { Db } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { createBug, listOpenBugs } from '../../_lib/bugs/repo';

interface BugEnv { DB: Db; AGENT_TOKEN?: string }

const MAX_TITLE = 200;
const MAX_BODY = 8000;
const MAX_CONTEXT = 20000;
const SEVERITIES = new Set(['low', 'medium', 'high']);

// POST /api/bugs — open intake (no account required).
export async function onRequestPost(ctx: { request: Request; env: BugEnv }): Promise<Response> {
  const b = await readJson<Record<string, unknown>>(ctx.request);
  if (!b) return error(400, 'json_required');

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const body = typeof b.body === 'string' ? b.body.trim() : '';
  if (!title || !body) return error(400, 'title_and_body_required');
  if (title.length > MAX_TITLE) return error(400, 'title_too_long');
  if (body.length > MAX_BODY) return error(400, 'body_too_long');

  const severity = typeof b.severity === 'string' ? b.severity : 'medium';
  if (!SEVERITIES.has(severity)) return error(400, 'bad_severity');

  const contextJson = typeof b.context === 'string' ? b.context.slice(0, MAX_CONTEXT)
    : b.context != null ? JSON.stringify(b.context).slice(0, MAX_CONTEXT) : null;
  const url = typeof b.url === 'string' ? b.url.slice(0, 500) : null;
  const reporter = typeof b.reporter === 'string' ? b.reporter.slice(0, 200) : null;

  const id = await createBug(
    ctx.env.DB,
    { title, body, contextJson, url, reporter, severity: severity as 'low' | 'medium' | 'high' },
    new Date().toISOString(),
  );
  return json({ id, status: 'open' }, { status: 201 });
}

// GET /api/bugs?token=... — agent listing of open bugs (token-gated).
export async function onRequestGet(ctx: { request: Request; env: BugEnv }): Promise<Response> {
  const token = new URL(ctx.request.url).searchParams.get('token') ?? '';
  if (!ctx.env.AGENT_TOKEN || token !== ctx.env.AGENT_TOKEN) {
    return new Response('not found', { status: 404 });
  }
  const bugs = await listOpenBugs(ctx.env.DB);
  return json({ count: bugs.length, bugs });
}
