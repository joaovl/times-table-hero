import type { RewardRulesConfig, DailyRule } from '@/lib/rewards-types';
import { DEFAULT_BALANCE, DEFAULT_TIER } from '@/lib/rewards-types';
import { useT } from '@/lib/i18n/react';
import { Input } from '@/components/ui/input';
import { NumberField } from '@/components/ui/NumberField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props { value: RewardRulesConfig; onChange: (c: RewardRulesConfig) => void }

type DailyGate = Pick<DailyRule, 'goal' | 'score' | 'weakTopics' | 'focus'>;

export default function RewardRulesForm({ value, onChange }: Props) {
  const { t } = useT();
  const d = value.daily;
  const isBalance = d.mode === 'balance';

  const setGate = (patch: Partial<DailyGate>) =>
    onChange({ ...value, daily: { ...d, ...patch } as DailyRule });
  const setScore = (kind: 'dailyPercent' | 'lastNAverage') =>
    setGate({ score: kind === 'dailyPercent' ? { kind, minPercent: 80 } : { kind, n: 2, minPercent: 100 } });
  const setRewardType = (mode: 'fixed' | 'balance') => {
    if (mode === d.mode) return;
    const gate: DailyGate = { goal: d.goal, score: d.score, weakTopics: d.weakTopics, focus: d.focus };
    const daily: DailyRule = mode === 'balance'
      ? { mode: 'balance', ...gate, balance: { ...DEFAULT_BALANCE } }
      : { mode: 'fixed', ...gate, dailyReward: '' };
    onChange({ ...value, daily });
  };
  const setBalance = (patch: Partial<typeof DEFAULT_BALANCE>) => {
    if (d.mode !== 'balance' || !d.balance) return;
    onChange({ ...value, daily: { ...d, balance: { ...d.balance, ...patch } } });
  };

  // Ladder helpers.
  const setTier = (i: number, patch: Partial<{ threshold: number; reward: string }>) =>
    onChange({ ...value, ladder: value.ladder.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  const addTier = () => onChange({ ...value, ladder: [...value.ladder, { ...DEFAULT_TIER }] });
  const removeTier = (i: number) => onChange({ ...value, ladder: value.ladder.filter((_, idx) => idx !== i) });

  // Targeted practice: a day only counts if she practised one of these tables.
  const focus = d.focus ?? [];
  const toggleFocus = (t: number) => {
    const key = `table-${t}`;
    const next = focus.includes(key) ? focus.filter(f => f !== key) : [...focus, key];
    setGate({ focus: next });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">{t('parent.rewards.form.everyDay')}</h3>
        <label className="block text-sm font-medium" htmlFor="min">{t('parent.rewards.form.minutesPerDay')}</label>
        <NumberField id="min" min={1}
          value={d.goal.minutes ?? 1}
          onCommit={n => setGate({ goal: { ...d.goal, minutes: n } })} />

        <label className="block text-sm font-medium" htmlFor="score">{t('parent.rewards.form.scoreRequirement')}</label>
        <select id="score" aria-label={t('parent.rewards.form.scoreRequirement')} className="border rounded-md px-2 py-1 w-full"
          value={d.score.kind} onChange={e => setScore(e.target.value as 'dailyPercent' | 'lastNAverage')}>
          <option value="dailyPercent">{t('parent.rewards.form.minPercentDaily')}</option>
          <option value="lastNAverage">{t('parent.rewards.form.averageLastFew')}</option>
        </select>
        {d.score.kind === 'lastNAverage' && (
          <>
            <label className="block text-sm font-medium" htmlFor="lastn">{t('parent.rewards.form.recentExercisesToAverage')}</label>
            <NumberField id="lastn" min={1}
              value={d.score.n}
              onCommit={n => setGate({ score: { ...d.score, n } })} />
          </>
        )}
        <label className="block text-sm font-medium" htmlFor="minpct">{t('parent.rewards.form.minimumPercent')}</label>
        <NumberField id="minpct" min={0} max={100}
          value={d.score.minPercent}
          onCommit={n => setGate({ score: { ...d.score, minPercent: n } })} />

        <label className="block text-sm font-medium" htmlFor="rewardtype">{t('parent.rewards.form.rewardType')}</label>
        <select id="rewardtype" aria-label={t('parent.rewards.form.rewardType')} className="border rounded-md px-2 py-1 w-full"
          value={isBalance ? 'balance' : 'fixed'}
          onChange={e => setRewardType(e.target.value as 'fixed' | 'balance')}>
          <option value="fixed">{t('parent.rewards.form.fixedRewardOption')}</option>
          <option value="balance">{t('parent.rewards.form.balanceRewardOption')}</option>
        </select>

        {!isBalance && (
          <>
            <label className="block text-sm font-medium" htmlFor="daily">{t('parent.rewards.form.dailyReward')}</label>
            <Input id="daily" placeholder={t('parent.rewards.form.dailyRewardPlaceholder')}
              value={d.dailyReward ?? ''}
              onChange={e => onChange({ ...value, daily: { ...d, dailyReward: e.target.value } })} />
          </>
        )}

        {d.mode === 'balance' && d.balance && (
          <div className="space-y-3 border-t pt-3">
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {t('parent.rewards.form.unitExplainPre')} <strong>{t('parent.rewards.form.unitWord')}</strong> {t('parent.rewards.form.unitExplainMid')}{' '}
              <em>{t('parent.rewards.form.unitExplainExample')}</em>{t('parent.rewards.form.unitExplainEnd')}
            </p>
            <label className="block text-sm font-medium" htmlFor="unit">{t('parent.rewards.form.rewardUnit')}</label>
            <Input id="unit" placeholder={t('parent.rewards.form.rewardUnitPlaceholder')}
              value={d.balance.unitLabel}
              onChange={e => setBalance({ unitLabel: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t('parent.rewards.form.rewardUnitHelp')}</p>
            <label className="block text-sm font-medium" htmlFor="mpu">{t('parent.rewards.form.minutesPerUnit')}</label>
            <NumberField id="mpu" min={0} value={d.balance.minutesPerUnit} onCommit={n => setBalance({ minutesPerUnit: n })} />
            <p className="text-xs text-muted-foreground">{t('parent.rewards.form.minutesPerUnitHelp')}</p>
            <label className="block text-sm font-medium" htmlFor="epu">{t('parent.rewards.form.exercisesPerUnit')}</label>
            <NumberField id="epu" min={0} value={d.balance.exercisesPerUnit} onCommit={n => setBalance({ exercisesPerUnit: n })} />
            <p className="text-xs text-muted-foreground">{t('parent.rewards.form.exercisesPerUnitHelp')}</p>
            <label className="block text-sm font-medium" htmlFor="rpu">{t('parent.rewards.form.rewardPerUnit')}</label>
            <NumberField id="rpu" min={0} value={d.balance.rewardPerUnit} onCommit={n => setBalance({ rewardPerUnit: n })} />
            <p className="text-xs text-muted-foreground">{t('parent.rewards.form.rewardPerUnitHelp')}</p>
            <label className="block text-sm font-medium" htmlFor="pen">{t('parent.rewards.form.penaltyPerMissedDay')}</label>
            <NumberField id="pen" min={0} value={d.balance.penaltyPerMissedDay} onCommit={n => setBalance({ penaltyPerMissedDay: n })} />
            <p className="text-xs text-muted-foreground">{t('parent.rewards.form.penaltyPerMissedDayHelp')}</p>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-bold">{t('parent.rewards.form.focusTitle')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('parent.rewards.form.focusHelp')}
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
            <button key={n} type="button" aria-label={t('parent.rewards.form.focusOnTable', { n })}
              aria-pressed={focus.includes(`table-${n}`)}
              onClick={() => toggleFocus(n)}
              className={cn('min-w-[40px] px-3 py-1 rounded-md text-sm font-bold border transition-colors',
                focus.includes(`table-${n}`) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
              {n}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold">{t('parent.rewards.form.ladderTitle')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('parent.rewards.form.ladderExplainPre')} <strong>{t('parent.rewards.form.ladderExplainStrong')}</strong> {t('parent.rewards.form.ladderExplainEnd')}
        </p>
        <ul className="space-y-2">
          {value.ladder.map((tier, i) => (
            <li key={i} className="flex items-end gap-2 border rounded-lg p-2">
              <div className="flex-none">
                <label className="block text-[11px] font-medium" htmlFor={`tier-th-${i}`}>{t('parent.rewards.form.afterDays')}</label>
                <NumberField id={`tier-th-${i}`} min={1} className="w-20"
                  value={tier.threshold} onCommit={n => setTier(i, { threshold: n })} />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium" htmlFor={`tier-rw-${i}`}>{t('parent.rewards.form.reward')}</label>
                <Input id={`tier-rw-${i}`} placeholder={t('parent.rewards.form.rewardPlaceholder')}
                  value={tier.reward} onChange={e => setTier(i, { reward: e.target.value })} />
              </div>
              <Button type="button" variant="outline" aria-label={t('parent.rewards.form.removeTier', { n: i + 1 })} onClick={() => removeTier(i)}>{t('parent.kids.remove')}</Button>
            </li>
          ))}
          {value.ladder.length === 0 && <li className="text-sm text-muted-foreground">{t('parent.rewards.form.noTiersYet')}</li>}
        </ul>
        <Button type="button" variant="outline" onClick={addTier}>{t('parent.rewards.form.addReward')}</Button>
      </Card>

      <Card className="p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" aria-label={t('parent.rewards.form.pauseHoliday')}
            checked={value.paused}
            onChange={e => onChange({ ...value, paused: e.target.checked })} />
          {t('parent.rewards.form.pauseHolidayLabel')}
        </label>
      </Card>
    </div>
  );
}
