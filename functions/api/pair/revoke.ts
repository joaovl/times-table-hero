import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { deleteDevicePairingByPrefix } from '../../_lib/auth/pairing';

// Identifies the device by the token-hash prefix returned from GET /api/pair/list
// (never the raw token). Account-scoped: only deletes a pairing owned by the caller.
export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  const body = await readJson<{ tokenHashPrefix?: string }>(ctx.request);
  if (!body || typeof body.tokenHashPrefix !== 'string' || !body.tokenHashPrefix) {
    return error(400, 'invalid_input');
  }
  await deleteDevicePairingByPrefix(ctx.env.DB, body.tokenHashPrefix, account.id);
  return json({ ok: true });
}
