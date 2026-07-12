import type { Db } from '../../_lib/auth/types';
import { json, error } from '../../_lib/http';
import { getPublicBug } from '../../_lib/bugs/repo';

// GET /api/bugs/:id — public status poll (privacy-safe fields only).
export async function onRequestGet(ctx: { request: Request; env: { DB: Db }; params: { id: string } }): Promise<Response> {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id <= 0) return error(400, 'bad_id');
  const bug = await getPublicBug(ctx.env.DB, id);
  if (!bug) return error(404, 'bug_not_found');
  return json(bug);
}
