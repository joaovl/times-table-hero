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
      .catch(() => { /* no kids / not signed in */ })
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

          {data?.mode === 'balance' && (
            <Card className="p-5">
              <p className="text-lg">Earned balance</p>
              <p className="text-3xl font-extrabold text-primary">{data.balanceUnits} {data.unitLabel}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {data.days.map(d => (
                  <li key={d.date} className="flex justify-between">
                    <span>{d.date}</span>
                    <span className={d.status === 'missed' ? 'text-destructive' : d.status === 'earned' ? 'text-success' : 'text-muted-foreground'}>
                      {d.status === 'pending' ? 'today' : `${(d.units ?? 0) >= 0 ? '+' : ''}${d.units}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data?.mode === 'fixed' && (
            <Card className="p-5">
              <p className="text-lg font-semibold">Rewards earned</p>
              {data.earned.length === 0
                ? <p className="text-muted-foreground text-sm">Nothing earned yet.</p>
                : <ul className="mt-2 space-y-1 text-sm">{data.earned.map(e => <li key={e.periodKey}>{e.periodKey}: {e.rewardLabel}</li>)}</ul>}
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
