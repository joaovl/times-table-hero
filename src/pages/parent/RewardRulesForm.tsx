import type { RewardRulesConfig, DailyRule } from '@/lib/rewards-types';
import { DEFAULT_BALANCE, DEFAULT_TIER } from '@/lib/rewards-types';
import { Input } from '@/components/ui/input';
import { NumberField } from '@/components/ui/NumberField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props { value: RewardRulesConfig; onChange: (c: RewardRulesConfig) => void }

type DailyGate = Pick<DailyRule, 'goal' | 'score' | 'weakTopics' | 'focus'>;

export default function RewardRulesForm({ value, onChange }: Props) {
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
        <h3 className="font-bold">Every day</h3>
        <label className="block text-sm font-medium" htmlFor="min">Minutes of practice per day</label>
        <NumberField id="min" min={1}
          value={d.goal.minutes ?? 1}
          onCommit={n => setGate({ goal: { ...d.goal, minutes: n } })} />

        <label className="block text-sm font-medium" htmlFor="score">Score requirement</label>
        <select id="score" aria-label="Score requirement" className="border rounded-md px-2 py-1 w-full"
          value={d.score.kind} onChange={e => setScore(e.target.value as 'dailyPercent' | 'lastNAverage')}>
          <option value="dailyPercent">Minimum percent correct for the day</option>
          <option value="lastNAverage">Average of the last few exercises</option>
        </select>
        {d.score.kind === 'lastNAverage' && (
          <>
            <label className="block text-sm font-medium" htmlFor="lastn">Number of recent exercises to average</label>
            <NumberField id="lastn" min={1}
              value={d.score.n}
              onCommit={n => setGate({ score: { ...d.score, n } })} />
          </>
        )}
        <label className="block text-sm font-medium" htmlFor="minpct">Minimum percent</label>
        <NumberField id="minpct" min={0} max={100}
          value={d.score.minPercent}
          onCommit={n => setGate({ score: { ...d.score, minPercent: n } })} />

        <label className="block text-sm font-medium" htmlFor="rewardtype">Reward type</label>
        <select id="rewardtype" aria-label="Reward type" className="border rounded-md px-2 py-1 w-full"
          value={isBalance ? 'balance' : 'fixed'}
          onChange={e => setRewardType(e.target.value as 'fixed' | 'balance')}>
          <option value="fixed">One fixed reward when the goal is met</option>
          <option value="balance">Earned balance that scales (e.g. TV time)</option>
        </select>

        {!isBalance && (
          <>
            <label className="block text-sm font-medium" htmlFor="daily">Daily reward</label>
            <Input id="daily" placeholder="e.g. 1 pound or 2 Pokemon cards"
              value={d.dailyReward ?? ''}
              onChange={e => onChange({ ...value, daily: { ...d, dailyReward: e.target.value } })} />
          </>
        )}

        {d.mode === 'balance' && d.balance && (
          <div className="space-y-3 border-t pt-3">
            <label className="block text-sm font-medium" htmlFor="unit">Reward unit (what she earns)</label>
            <Input id="unit" placeholder="e.g. hours of TV"
              value={d.balance.unitLabel}
              onChange={e => setBalance({ unitLabel: e.target.value })} />
            <label className="block text-sm font-medium" htmlFor="mpu">Minutes of practice per unit earned</label>
            <NumberField id="mpu" min={0} value={d.balance.minutesPerUnit} onCommit={n => setBalance({ minutesPerUnit: n })} />
            <label className="block text-sm font-medium" htmlFor="epu">Exercises per unit earned</label>
            <NumberField id="epu" min={0} value={d.balance.exercisesPerUnit} onCommit={n => setBalance({ exercisesPerUnit: n })} />
            <label className="block text-sm font-medium" htmlFor="rpu">Units earned each time</label>
            <NumberField id="rpu" min={0} value={d.balance.rewardPerUnit} onCommit={n => setBalance({ rewardPerUnit: n })} />
            <label className="block text-sm font-medium" htmlFor="pen">Units taken away on a missed day</label>
            <NumberField id="pen" min={0} value={d.balance.penaltyPerMissedDay} onCommit={n => setBalance({ penaltyPerMissedDay: n })} />
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-bold">Focus on times tables (optional)</h3>
        <p className="text-xs text-muted-foreground">
          Pick the tables you want practised most. A day only counts if she practised one of them.
          Leave all off to count any practice.
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(t => (
            <button key={t} type="button" aria-label={`Focus on the ${t} times table`}
              aria-pressed={focus.includes(`table-${t}`)}
              onClick={() => toggleFocus(t)}
              className={cn('min-w-[40px] px-3 py-1 rounded-md text-sm font-bold border transition-colors',
                focus.includes(`table-${t}`) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Reward ladder</h3>
        <p className="text-xs text-muted-foreground">
          Add as many rewards (&ldquo;jumps&rdquo;) as you like. Each unlocks after a number of <strong>total successful days</strong> — progress is never lost.
        </p>
        <ul className="space-y-2">
          {value.ladder.map((tier, i) => (
            <li key={i} className="flex items-end gap-2 border rounded-lg p-2">
              <div className="flex-none">
                <label className="block text-[11px] font-medium" htmlFor={`tier-th-${i}`}>After (days)</label>
                <NumberField id={`tier-th-${i}`} min={1} className="w-20"
                  value={tier.threshold} onCommit={n => setTier(i, { threshold: n })} />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium" htmlFor={`tier-rw-${i}`}>Reward</label>
                <Input id={`tier-rw-${i}`} placeholder="e.g. a toy"
                  value={tier.reward} onChange={e => setTier(i, { reward: e.target.value })} />
              </div>
              <Button type="button" variant="outline" aria-label={`Remove tier ${i + 1}`} onClick={() => removeTier(i)}>Remove</Button>
            </li>
          ))}
          {value.ladder.length === 0 && <li className="text-sm text-muted-foreground">No reward tiers yet.</li>}
        </ul>
        <Button type="button" variant="outline" onClick={addTier}>Add a reward</Button>
      </Card>

      <Card className="p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" aria-label="Pause rewards for a holiday"
            checked={value.paused}
            onChange={e => onChange({ ...value, paused: e.target.checked })} />
          Pause rewards (holiday) — missed days won&rsquo;t count against her
        </label>
      </Card>
    </div>
  );
}
