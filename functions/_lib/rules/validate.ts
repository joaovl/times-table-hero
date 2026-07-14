import type { DailyRule, RewardRulesConfig } from './types';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonNegNum = (v: unknown): v is number => isNum(v) && v >= 0;
const isStr = (v: unknown): v is string => typeof v === 'string';

function gateValid(v: Record<string, unknown>): boolean {
  if (!isObj(v.goal)) return false;
  const g = v.goal;
  const goalKeys: (keyof typeof g)[] = ['minutes', 'exercises', 'sessions'];
  const setGoals = goalKeys.filter(k => g[k] !== undefined);
  if (setGoals.length === 0 || !setGoals.every(k => isNum(g[k]))) return false;

  const s = v.score;
  if (!isObj(s)) return false;
  if (s.kind === 'dailyPercent') {
    if (!isNum(s.minPercent)) return false;
  } else if (s.kind === 'lastNAverage') {
    if (!isNum(s.n) || !isNum(s.minPercent)) return false;
  } else {
    return false;
  }

  if (v.weakTopics !== undefined) {
    const w = v.weakTopics;
    if (!isObj(w) || !Array.isArray(w.topics) || !w.topics.every(isStr) || !isNum(w.minPercent)) return false;
  }
  if (v.focus !== undefined && (!Array.isArray(v.focus) || !v.focus.every(isStr))) return false;
  return true;
}

function balanceValid(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    isStr(v.unitLabel) && v.unitLabel.length > 0 &&
    isNonNegNum(v.minutesPerUnit) &&
    isNonNegNum(v.exercisesPerUnit) &&
    isNonNegNum(v.rewardPerUnit) &&
    isNonNegNum(v.penaltyPerMissedDay)
  );
}

function parseDaily(v: unknown): DailyRule | null {
  if (!isObj(v) || !gateValid(v)) return null;
  if (v.mode === 'balance') {
    if (!balanceValid(v.balance)) return null;
  } else {
    // fixed (mode 'fixed' or absent)
    if (!isStr(v.dailyReward)) return null;
  }
  return v as unknown as DailyRule;
}

function ladderValid(v: unknown): v is { threshold: number; reward: string }[] {
  if (!Array.isArray(v)) return false;
  return v.every(t => isObj(t) && isNum(t.threshold) && t.threshold >= 1 && isStr(t.reward));
}

export function parseRewardRules(input: unknown): RewardRulesConfig | null {
  if (!isObj(input)) return null;
  const daily = parseDaily(input.daily);
  if (!daily) return null;
  if (!ladderValid(input.ladder)) return null;
  if (typeof input.paused !== 'boolean') return null;
  return { daily, ladder: input.ladder, paused: input.paused };
}
