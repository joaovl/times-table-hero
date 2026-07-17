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
  // token_hash is standard base64 (btoa) of a SHA-256 digest; listDevicePairings exposes the
  // first 8 chars as tokenHashPrefix. Require the full 8-char base64 alphabet (no padding
  // possible in the first 8 chars) so a truncated/wildcard prefix can't match multiple rows.
  if (!body || typeof body.tokenHashPrefix !== 'string' || !/^[A-Za-z0-9+/]{8}$/.test(body.tokenHashPrefix)) {
    return error(400, 'invalid_input');
  }
  await deleteDevicePairingByPrefix(ctx.env.DB, body.tokenHashPrefix, account.id);
  return json({ ok: true });
}
