import type { RewardRulesConfig, Level1Rule, Level1Gate } from '@/lib/rewards-types';
import { DEFAULT_BALANCE } from '@/lib/rewards-types';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Props { value: RewardRulesConfig; onChange: (c: RewardRulesConfig) => void }

// Parse a numeric input, keeping a minimum so required fields never go invalid.
const num = (raw: string, min: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? n : min;
};

export default function RewardRulesForm({ value, onChange }: Props) {
  const l1 = value.level1;
  const isBalance = l1.mode === 'balance';

  // Patch gate fields (goal/score/weakTopics) — common to both reward modes.
  const setGate = (patch: Partial<Level1Gate>) =>
    onChange({ ...value, level1: { ...l1, ...patch } as Level1Rule });

  const setScore = (kind: 'dailyPercent' | 'lastNAverage') =>
    setGate({ score: kind === 'dailyPercent' ? { kind, minPercent: 80 } : { kind, n: 2, minPercent: 100 } });

  const setRewardType = (mode: 'fixed' | 'balance') => {
    if (mode === (l1.mode ?? 'fixed')) return;
    const gate: Level1Gate = { goal: l1.goal, score: l1.score, weakTopics: l1.weakTopics };
    const level1: Level1Rule = mode === 'balance'
      ? { mode: 'balance', ...gate, balance: { ...DEFAULT_BALANCE } }
      : { mode: 'fixed', ...gate, dailyReward: '' };
    onChange({ ...value, level1 });
  };

  const setBalance = (patch: Partial<typeof DEFAULT_BALANCE>) => {
    if (l1.mode !== 'balance') return;
    onChange({ ...value, level1: { ...l1, balance: { ...l1.balance, ...patch } } });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 1 — daily goal</h3>
        <label className="block text-sm font-medium" htmlFor="min">Minutes of practice per day</label>
        <Input id="min" type="number" inputMode="numeric" min={1}
          value={l1.goal.minutes ?? 1}
          onChange={e => setGate({ goal: { ...l1.goal, minutes: num(e.target.value, 1) } })} />

        <label className="block text-sm font-medium" htmlFor="score">Score requirement</label>
        <select id="score" aria-label="Score requirement" className="border rounded-md px-2 py-1 w-full"
          value={l1.score.kind} onChange={e => setScore(e.target.value as 'dailyPercent' | 'lastNAverage')}>
          <option value="dailyPercent">Minimum percent correct for the day</option>
          <option value="lastNAverage">Average of the last few exercises</option>
        </select>
        {l1.score.kind === 'lastNAverage' && (
          <>
            <label className="block text-sm font-medium" htmlFor="lastn">Number of recent exercises to average</label>
            <Input id="lastn" type="number" inputMode="numeric" min={1}
              value={l1.score.n}
              onChange={e => setGate({ score: { ...l1.score, n: num(e.target.value, 1) } })} />
          </>
        )}
        <label className="block text-sm font-medium" htmlFor="minpct">Minimum percent</label>
        <Input id="minpct" type="number" inputMode="numeric" min={0}
          value={l1.score.minPercent}
          onChange={e => setGate({ score: { ...l1.score, minPercent: num(e.target.value, 0) } })} />

        <label className="block text-sm font-medium" htmlFor="rewardtype">Reward type</label>
        <select id="rewardtype" aria-label="Reward type" className="border rounded-md px-2 py-1 w-full"
          value={isBalance ? 'balance' : 'fixed'}
          onChange={e => setRewardType(e.target.value as 'fixed' | 'balance')}>
          <option value="fixed">One fixed reward when the goal is met</option>
          <option value="balance">Earned balance that scales (e.g. TV time)</option>
        </select>

        {!isBalance && l1.mode !== 'balance' && (
          <>
            <label className="block text-sm font-medium" htmlFor="daily">Daily reward</label>
            <Input id="daily" placeholder="e.g. 1 pound or 2 Pokemon cards"
              value={l1.dailyReward}
              onChange={e => setGate({ dailyReward: e.target.value } as Partial<Level1Gate>)} />
          </>
        )}

        {l1.mode === 'balance' && (
          <div className="space-y-3 border-t pt-3">
            <label className="block text-sm font-medium" htmlFor="unit">Reward unit (what she earns)</label>
            <Input id="unit" placeholder="e.g. hours of TV"
              value={l1.balance.unitLabel}
              onChange={e => setBalance({ unitLabel: e.target.value })} />
            <label className="block text-sm font-medium" htmlFor="mpu">Minutes of practice per unit earned</label>
            <Input id="mpu" type="number" inputMode="numeric" min={0}
              value={l1.balance.minutesPerUnit}
              onChange={e => setBalance({ minutesPerUnit: num(e.target.value, 0) })} />
            <label className="block text-sm font-medium" htmlFor="epu">Exercises per unit earned</label>
            <Input id="epu" type="number" inputMode="numeric" min={0}
              value={l1.balance.exercisesPerUnit}
              onChange={e => setBalance({ exercisesPerUnit: num(e.target.value, 0) })} />
            <label className="block text-sm font-medium" htmlFor="rpu">Units earned each time</label>
            <Input id="rpu" type="number" inputMode="numeric" min={0}
              value={l1.balance.rewardPerUnit}
              onChange={e => setBalance({ rewardPerUnit: num(e.target.value, 0) })} />
            <label className="block text-sm font-medium" htmlFor="pen">Units taken away on a missed day</label>
            <Input id="pen" type="number" inputMode="numeric" min={0}
              value={l1.balance.penaltyPerMissedDay}
              onChange={e => setBalance({ penaltyPerMissedDay: num(e.target.value, 0) })} />
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 2 — weekly streak</h3>
        <label className="block text-sm font-medium" htmlFor="days">Successful days per week</label>
        <Input id="days" type="number" inputMode="numeric" min={1} max={7}
          value={value.level2.successDaysRequired}
          onChange={e => onChange({ ...value, level2: { ...value.level2, successDaysRequired: num(e.target.value, 1) } })} />
        <label className="block text-sm font-medium" htmlFor="weekly">Weekly reward</label>
        <Input id="weekly" placeholder="e.g. 10 pounds or a toy"
          value={value.level2.weeklyReward}
          onChange={e => onChange({ ...value, level2: { ...value.level2, weeklyReward: e.target.value } })} />
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 3 — bigger reward</h3>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" aria-label="Enable a bigger reward"
            checked={value.level3.enabled}
            onChange={e => onChange({ ...value, level3: { ...value.level3, enabled: e.target.checked } })} />
          Enable a bigger reward
        </label>
        <label className="block text-sm font-medium" htmlFor="target">Earned after</label>
        <select id="target" aria-label="Extended target" className="border rounded-md px-2 py-1 w-full"
          value={value.level3.target}
          onChange={e => onChange({ ...value, level3: { ...value.level3, target: e.target.value as '2weeks' | 'month' } })}>
          <option value="2weeks">2 weeks in a row</option>
          <option value="month">A whole month</option>
        </select>
        <label className="block text-sm font-medium" htmlFor="big">Bigger reward</label>
        <Input id="big" placeholder="e.g. shoes or a day out"
          value={value.level3.reward}
          onChange={e => onChange({ ...value, level3: { ...value.level3, reward: e.target.value } })} />
      </Card>
    </div>
  );
}
