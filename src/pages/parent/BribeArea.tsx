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
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');

  // Seed the form from the stored rule for a scope. Called only on explicit
  // events (initial load, scope change) — never on every `rules` update, so a
  // background refetch can't clobber the parent's in-progress edits.
  const seed = (scopeVal: string, rulesData: RulesRow[]) => {
    const kidId = scopeVal === '' ? null : scopeVal;
    const found = rulesData.find(r => r.kidId === kidId);
    setConfig(found ? found.config : DEFAULT_RULES);
  };

  // Gate the form behind `loaded`: rendering the editable fields only after the
  // stored rules arrive prevents the async seed from overwriting a value the
  // parent typed while the request was still in flight.
  useEffect(() => {
    Promise.all([kidsList(), rulesList()])
      .then(([k, r]) => { setKids(k); setRules(r); seed('', r); })
      .catch(() => setStatus('Could not load.'))
      .finally(() => setLoaded(true));
  }, []);

  const onScope = (v: string) => { setScope(v); seed(v, rules); };

  const save = async () => {
    setStatus('');
    try {
      await rulesPut(scope === '' ? null : scope, config);
      setStatus('Saved.');
      setRules(await rulesList()); // refresh cache without reseeding the form
    } catch { setStatus('Could not save.'); }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Reward settings</h1>
      {!loaded ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">Loading…</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor="scope">These rules apply to</label>
            <select id="scope" aria-label="Rules apply to" className="border rounded-md px-2 py-1"
              value={scope} onChange={e => onScope(e.target.value)}>
              <option value="">All kids</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <RewardRulesForm value={config} onChange={setConfig} />
          <div className="flex items-center gap-3">
            <Button onClick={save}>Save</Button>
            {status && <span className="text-sm text-muted-foreground">{status}</span>}
          </div>
        </>
      )}
    </div>
  );
}
