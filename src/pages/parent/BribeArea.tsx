import { useEffect, useState } from 'react';
import { kidsList, rulesList, rulesPut, type Kid, type RulesRow } from '@/lib/api/client';
import { DEFAULT_RULES, type RewardRulesConfig } from '@/lib/rewards-types';
import RewardRulesForm from './RewardRulesForm';
import { Button } from '@/components/ui/button';

export default function BribeArea() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [rules, setRules] = useState<RulesRow[]>([]);
  const [scope, setScope] = useState<string>(''); // '' = all kids; else kidId
  const [config, setConfig] = useState<RewardRulesConfig>(DEFAULT_RULES);
  const [status, setStatus] = useState('');

  useEffect(() => {
    Promise.all([kidsList(), rulesList()]).then(([k, r]) => { setKids(k); setRules(r); }).catch(() => setStatus('Could not load.'));
  }, []);

  // Seed the form from the stored rule for the selected scope (or defaults).
  useEffect(() => {
    const kidId = scope === '' ? null : scope;
    const found = rules.find(r => r.kidId === kidId);
    setConfig(found ? found.config : DEFAULT_RULES);
  }, [scope, rules]);

  const save = async () => {
    setStatus('');
    try {
      await rulesPut(scope === '' ? null : scope, config);
      setStatus('Saved.');
      const r = await rulesList();
      setRules(r);
    } catch { setStatus('Could not save.'); }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Reward settings</h1>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor="scope">These rules apply to</label>
        <select id="scope" aria-label="Rules apply to" className="border rounded-md px-2 py-1"
          value={scope} onChange={e => setScope(e.target.value)}>
          <option value="">All kids</option>
          {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </div>
      <RewardRulesForm value={config} onChange={setConfig} />
      <div className="flex items-center gap-3">
        <Button onClick={save}>Save</Button>
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
      </div>
    </div>
  );
}
