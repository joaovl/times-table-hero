import { useEffect, useState } from 'react';
import { getUsers, type UserProfile } from '@/lib/userStorage';
import { kidsList, type Kid } from '@/lib/api/client';
import { getAllLinks, setLink, clearLink } from '@/lib/practice/kidLink';
import { Card } from '@/components/ui/card';

// Maps the device's local player profiles to the account's cloud kids, so that
// when a child practises, the session is logged to the right kid's dashboard.
export default function ParentLink() {
  const [profiles] = useState<UserProfile[]>(() => getUsers());
  const [kids, setKids] = useState<Kid[]>([]);
  const [links, setLinks] = useState<Record<string, string>>(() => getAllLinks());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kidsList().then(setKids).catch(() => { /* ignore */ }).finally(() => setLoaded(true));
  }, []);

  const onChange = (profileId: string, kidId: string) => {
    if (kidId) setLink(profileId, kidId);
    else clearLink(profileId);
    setLinks(getAllLinks());
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Link players to your kids</h1>
      <p className="text-sm text-muted-foreground">
        On this device each child picks a player. Link each player to one of your kids so their
        practice counts towards that kid&rsquo;s rewards. Do this once per device.
      </p>

      {!loaded ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">Loading…</p>
      ) : kids.length === 0 ? (
        <p className="text-muted-foreground">Add a kid first, then come back to link players.</p>
      ) : profiles.length === 0 ? (
        <p className="text-muted-foreground">No players have been created on this device yet.</p>
      ) : (
        <Card className="p-5 space-y-3">
          <ul className="space-y-3">
            {profiles.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="font-semibold">{p.name}</span>
                <select
                  aria-label={`Link ${p.name} to a kid`}
                  className="border rounded-md px-2 py-1"
                  value={links[p.id] ?? ''}
                  onChange={e => onChange(p.id, e.target.value)}
                >
                  <option value="">Not linked</option>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
