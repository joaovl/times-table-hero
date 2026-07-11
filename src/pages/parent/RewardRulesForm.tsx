import type { RewardRulesConfig, Level1Rule } from '@/lib/rewards-types';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Props { value: RewardRulesConfig; onChange: (c: RewardRulesConfig) => void }

// Parse a numeric input, keeping a minimum so required fields never go invalid.
const num = (raw: string, min: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? n : min;
};

export default function RewardRulesForm({ value, onChange }: Props) {
  const setL1 = (patch: Partial<Level1Rule>) => onChange({ ...value, level1: { ...value.level1, ...patch } });
  const setScore = (kind: 'dailyPercent' | 'lastNAverage') =>
    setL1({ score: kind === 'dailyPercent' ? { kind, minPercent: 80 } : { kind, n: 2, minPercent: 100 } });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 1 — daily goal</h3>
        <label className="block text-sm font-medium" htmlFor="min">Minutes of practice per day</label>
        <Input id="min" type="number" inputMode="numeric" min={1}
          value={value.level1.goal.minutes ?? 1}
          onChange={e => setL1({ goal: { ...value.level1.goal, minutes: num(e.target.value, 1) } })} />

        <label className="block text-sm font-medium" htmlFor="score">Score requirement</label>
        <select id="score" aria-label="Score requirement" className="border rounded-md px-2 py-1 w-full"
          value={value.level1.score.kind} onChange={e => setScore(e.target.value as 'dailyPercent' | 'lastNAverage')}>
          <option value="dailyPercent">Minimum percent correct for the day</option>
          <option value="lastNAverage">Average of the last few exercises</option>
        </select>
        <label className="block text-sm font-medium" htmlFor="minpct">Minimum percent</label>
        <Input id="minpct" type="number" inputMode="numeric" min={0}
          value={value.level1.score.minPercent}
          onChange={e => setL1({ score: { ...value.level1.score, minPercent: num(e.target.value, 0) } })} />

        <label className="block text-sm font-medium" htmlFor="daily">Daily reward</label>
        <Input id="daily" placeholder="e.g. 1 pound or 2 Pokemon cards"
          value={value.level1.dailyReward}
          onChange={e => setL1({ dailyReward: e.target.value })} />
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
