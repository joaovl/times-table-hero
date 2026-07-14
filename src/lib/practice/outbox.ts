import { sessionsLog, type SessionInput } from '@/lib/api/client';

// A durable queue of practice sessions. Sessions are logged locally first and
// flushed to /api/sessions when possible, so a child can practise offline and
// it syncs later. The server INSERT OR IGNOREs by id, making retries safe.

const KEY = 'tth_session_outbox';
const MAX = 200;
type Queued = SessionInput & { kidId: string };

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Queued[];
  } catch {
    return [];
  }
}
function write(q: Queued[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export function enqueue(s: Queued): void {
  const q = read();
  q.push(s);
  write(q.slice(-MAX));
}

let flushing = false;

export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const q = read();
    if (q.length === 0) return;
    const byKid = new Map<string, Queued[]>();
    for (const s of q) {
      const arr = byKid.get(s.kidId) ?? [];
      arr.push(s);
      byKid.set(s.kidId, arr);
    }
    const delivered = new Set<string>();
    for (const [kidId, sessions] of byKid) {
      try {
        await sessionsLog(kidId, sessions.map(({ kidId: _k, ...rest }) => rest));
        sessions.forEach(s => delivered.add(s.id));
      } catch {
        // leave this kid's sessions queued for the next flush
      }
    }
    if (delivered.size > 0) write(read().filter(s => !delivered.has(s.id)));
  } finally {
    flushing = false;
  }
}
