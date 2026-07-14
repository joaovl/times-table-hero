import { useEffect, useState } from 'react';
import { kidsList, dashboardGet, type Kid, type DashboardData } from '@/lib/api/client';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [kidId, setKidId] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kidsList()
      .then(k => { setKids(k); if (k[0]) setKidId(k[0].id); })
      .catch(() => { /* not signed in / no kids */ })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!kidId) { setData(null); return; }
    let active = true;
    dashboardGet(kidId).then(d => active && setData(d)).catch(() => active && setData(null));
    return () => { active = false; };
  }, [kidId]);

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Progress &amp; rewards</h1>
      {!loaded ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">Loading…</p>
      ) : kids.length === 0 ? (
        <p className="text-muted-foreground">Add a kid first to see their progress.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor="kid">Kid</label>
            <select id="kid" aria-label="Kid" className="border rounded-md px-2 py-1"
              value={kidId} onChange={e => setKidId(e.target.value)}>
              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>

          {data && data.mode !== 'none' && (
            <Card className="p-5 space-y-3">
              {data.paused && (
                <p className="text-sm font-semibold text-primary">Rewards are paused (holiday) — missed days don&rsquo;t count.</p>
              )}
              <p className="text-lg">
                Successful days so far: <span className="text-2xl font-extrabold text-primary">{data.totalSuccessfulDays}</span>
              </p>
              {data.mode === 'balance' && (
                <p className="text-3xl font-extrabold text-primary">{data.balanceUnits} {data.unitLabel}</p>
              )}

              <div>
                <h3 className="font-bold mb-1">Reward ladder</h3>
                <ul className="space-y-1 text-sm">
                  {data.tiers.map(t => (
                    <li key={t.threshold} className={t.earned ? 'text-success font-semibold' : 'text-muted-foreground'}>
                      {t.earned ? '✓' : '○'} {t.threshold} day{t.threshold === 1 ? '' : 's'} → {t.reward || '(no reward set)'}{t.earned ? ' — earned!' : ''}
                    </li>
                  ))}
                  {data.tiers.length === 0 && <li className="text-muted-foreground">No reward tiers set.</li>}
                </ul>
              </div>
            </Card>
          )}

          {data?.mode === 'none' && (
            <p className="text-muted-foreground">No reward rules set for this kid yet.</p>
          )}
        </>
      )}
    </div>
  );
}
