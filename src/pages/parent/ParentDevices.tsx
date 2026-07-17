import { useEffect, useState } from 'react';
import { pairList, pairRevoke, type PairedDevice } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ParentDevices() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    pairList()
      .then(list => { setDevices(list); setLoaded(true); })
      .catch(() => { setError('Could not load paired devices.'); setLoaded(true); });
  };

  useEffect(load, []);

  const revoke = async (tokenHashPrefix: string) => {
    try {
      await pairRevoke(tokenHashPrefix);
      load();
    } catch {
      setError('Could not revoke that device.');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Paired devices</h1>
      <p className="text-sm text-muted-foreground">
        These devices can be used to practise without logging in as a parent.
      </p>
      {!loaded ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">Loading…</p>
      ) : (
        <Card className="p-5 space-y-3">
          <ul className="space-y-2">
            {devices.map(d => (
              <li key={d.tokenHashPrefix} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <p className="font-semibold">{d.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Paired {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" aria-label={`Revoke ${d.label}`} onClick={() => revoke(d.tokenHashPrefix)}>
                  Revoke
                </Button>
              </li>
            ))}
            {devices.length === 0 && <li className="text-sm text-muted-foreground">No paired devices yet.</li>}
          </ul>
        </Card>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
