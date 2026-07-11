import { useEffect, useState, type FormEvent } from 'react';
import { kidsList, kidsCreate, kidsDelete, type Kid } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const COLORS = ['red', 'blue', 'green', 'purple'];
const ICONS = ['star', 'heart', 'rocket', 'flower'];

export default function ParentKids() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [error, setError] = useState('');

  useEffect(() => { kidsList().then(setKids).catch(() => setError('Could not load kids.')); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a name.'); return; }
    try {
      const kid = await kidsCreate({ name: trimmed, color, icon });
      setKids(prev => [...prev, kid]);
      setName('');
    } catch { setError('Could not add that kid.'); }
  };

  const remove = async (id: string) => {
    await kidsDelete(id);
    setKids(prev => prev.filter(k => k.id !== id));
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-xl font-bold">Kids</h2>
      <ul className="space-y-2">
        {kids.map(k => (
          <li key={k.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span className="font-semibold">{k.name}</span>
            <Button variant="outline" aria-label={`Remove ${k.name}`} onClick={() => remove(k.id)}>Remove</Button>
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
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit">Add kid</Button>
      </form>
    </Card>
  );
}
