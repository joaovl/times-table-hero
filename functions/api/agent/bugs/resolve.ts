import type { Db } from '../../../_lib/auth/types';
import { json, error, readJson } from '../../../_lib/http';
import { resolveBug } from '../../../_lib/bugs/repo';

interface BugEnv { DB: Db; AGENT_TOKEN?: string }

// POST /api/agent/bugs/resolve?token=... — maintainer tooling marks a bug
// fixed/wontfix and records the resolution. Token-gated.
export async function onRequestPost(ctx: { request: Request; env: BugEnv }): Promise<Response> {
  const token = new URL(ctx.request.url).searchParams.get('token') ?? '';
  if (!ctx.env.AGENT_TOKEN || token !== ctx.env.AGENT_TOKEN) {
    return new Response('not found', { status: 404 });
  }
  const b = await readJson<Record<string, unknown>>(ctx.request);
  const bugId = Number(b?.bug_id);
  const status = String(b?.status ?? '');
  const resolutionMd = typeof b?.resolution_md === 'string' ? b.resolution_md.trim() : '';
  if (!Number.isInteger(bugId) || (status !== 'fixed' && status !== 'wontfix') || !resolutionMd) {
    return error(400, 'bug_id_status_resolution_required');
  }
  const ok = await resolveBug(ctx.env.DB, bugId, status, resolutionMd, new Date().toISOString());
  if (!ok) return error(404, 'bug_not_open');
  return json({ ok: true });
}
