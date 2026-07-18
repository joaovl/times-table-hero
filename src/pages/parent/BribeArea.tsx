import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { kidsList, rulesList, rulesPut, type Kid, type RulesRow } from '@/lib/api/client';
import { DEFAULT_RULES, type RewardRulesConfig } from '@/lib/rewards-types';
import RewardRulesForm from './RewardRulesForm';
import { preflightRulesError, saveErrorMessage } from './saveFeedback';
import { useT } from '@/lib/i18n/react';
import { Button } from '@/components/ui/button';

export default function BribeArea() {
  const { t } = useT();
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
      .catch(() => setStatus(t('parent.rewards.errorLoad')))
      .finally(() => setLoaded(true));
  }, [t]);

  const onScope = (v: string) => { setScope(v); seed(v, rules); };

  const save = async () => {
    setStatus('');
    // Catch the one field the server hard-requires before a round-trip, so the
    // parent gets a specific hint instead of an opaque failure (bug #5).
    const preflight = preflightRulesError(config);
    if (preflight) { setStatus(preflight); return; }
    try {
      await rulesPut(scope === '' ? null : scope, config);
      setStatus(t('parent.rewards.saved'));
      setRules(await rulesList()); // refresh cache without reseeding the form
    } catch (e) {
      setStatus(saveErrorMessage((e as { status?: number }).status));
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <Link to="/parent" className="inline-block text-sm underline text-primary">{t('parent.rewards.backLink')}</Link>
      <h1 className="text-2xl font-bold">{t('parent.rewards.title')}</h1>
      {!loaded ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">{t('common.loadingEllipsis')}</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor="scope">{t('parent.rewards.theseRulesApplyTo')}</label>
            <select id="scope" aria-label={t('parent.rewards.rulesApplyTo')} className="border rounded-md px-2 py-1"
              value={scope} onChange={e => onScope(e.target.value)}>
              <option value="">{t('parent.rewards.allKids')}</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <RewardRulesForm value={config} onChange={setConfig} />
          <div className="flex items-center gap-3">
            <Button onClick={save}>{t('common.save')}</Button>
            {status && <span className="text-sm text-muted-foreground">{status}</span>}
          </div>
        </>
      )}
    </div>
  );
}
