const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', JSON_HEADERS['content-type']);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status: number, code: string, extraHeaders?: HeadersInit): Response {
  return json({ error: code }, { status, headers: extraHeaders });
}

/** Parse a JSON request body; returns null on malformed/empty bodies. */
export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
