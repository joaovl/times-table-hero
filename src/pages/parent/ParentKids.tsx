import { useEffect, useState, type FormEvent } from 'react';
import { kidsList, kidsCreate, kidsDelete, kidsUpdate, type Kid } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const COLORS = ['red', 'blue', 'green', 'purple'];
const ICONS = ['star', 'heart', 'rocket', 'flower'];
const PIN_RE = /^\d{6}$/;

export default function ParentKids() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [resetKidId, setResetKidId] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => { kidsList().then(setKids).catch(() => setError('Could not load kids.')); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a name.'); return; }
    if (!PIN_RE.test(pin)) { setError('Please enter a 6-digit PIN.'); return; }
    try {
      const kid = await kidsCreate({ name: trimmed, color, icon, pin });
      setKids(prev => [...prev, kid]);
      setName('');
      setPin('');
    } catch { setError('Could not add that kid.'); }
  };

  const remove = async (id: string) => {
    await kidsDelete(id);
    setKids(prev => prev.filter(k => k.id !== id));
  };

  const startReset = (id: string) => {
    setResetKidId(id);
    setResetPin('');
    setResetError('');
  };

  const cancelReset = () => {
    setResetKidId(null);
    setResetPin('');
    setResetError('');
  };

  const saveReset = async (kid: Kid) => {
    setResetError('');
    if (!PIN_RE.test(resetPin)) { setResetError('Please enter a 6-digit PIN.'); return; }
    try {
      await kidsUpdate(kid.id, { name: kid.name, color: kid.color, icon: kid.icon, pin: resetPin });
      setResetKidId(null);
      setResetPin('');
    } catch { setResetError('Could not reset that PIN.'); }
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-xl font-bold">Kids</h2>
      <ul className="space-y-2">
        {kids.map(k => (
          <li key={k.id} className="border rounded-lg px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{k.name}</span>
              <div className="flex gap-2">
                <Button variant="outline" aria-label={`Reset PIN for ${k.name}`} onClick={() => startReset(k.id)}>Reset PIN</Button>
                <Button variant="outline" aria-label={`Remove ${k.name}`} onClick={() => remove(k.id)}>Remove</Button>
              </div>
            </div>
            {resetKidId === k.id && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor={`reset-pin-${k.id}`}>New PIN for {k.name}</label>
                <Input id={`reset-pin-${k.id}`} aria-label={`New PIN for ${k.name}`} inputMode="numeric" maxLength={6} autoComplete="off"
                  value={resetPin} onChange={e => setResetPin(e.target.value.replace(/\D/g, ''))} className="w-24" />
                <Button onClick={() => saveReset(k)}>Save new PIN</Button>
                <Button variant="outline" onClick={cancelReset}>Cancel</Button>
              </div>
            )}
            {resetKidId === k.id && resetError && <p role="alert" className="text-sm text-destructive">{resetError}</p>}
          </li>
        ))}
        {kids.length === 0 && <li className="text-sm text-muted-foreground">No kids yet.</li>}
      </ul>
      <form onSubmit={add} className="space-y-2 border-t pt-4">
        <label className="block text-sm font-medium" htmlFor="kid-name">Name</label>
        <Input id="kid-name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2">
          <select aria-label="Colour" value={color} onChange={e => setColor(e.target.value)} className="border rounded-md px-2 py-1">
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Icon" value={icon} onChange={e => setIcon(e.target.value)} className="border rounded-md px-2 py-1">
            {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <label className="block text-sm font-medium" htmlFor="kid-pin">PIN</label>
        <Input id="kid-pin" aria-label="PIN" inputMode="numeric" maxLength={6} autoComplete="off"
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        <p className="text-xs text-muted-foreground">Your child enters this to pick their profile.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit">Add kid</Button>
      </form>
    </Card>
  );
}
