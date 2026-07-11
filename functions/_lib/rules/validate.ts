import type { Level2Rule, Level3Rule } from '../rewards/types';
import type { Level1Config, RewardRulesConfig } from './types';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonNegNum = (v: unknown): v is number => isNum(v) && v >= 0;
const isStr = (v: unknown): v is string => typeof v === 'string';

/** Validate the shared gate portion of Level 1 (goal + score + weak topics). */
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

function parseLevel1(v: unknown): Level1Config | null {
  if (!isObj(v) || !gateValid(v)) return null;
  if (v.mode === 'balance') {
    if (!balanceValid(v.balance)) return null;
  } else {
    // fixed (mode undefined or 'fixed')
    if (!isStr(v.dailyReward)) return null;
  }
  return v as unknown as Level1Config;
}

function parseLevel2(v: unknown): Level2Rule | null {
  if (!isObj(v) || !isNum(v.successDaysRequired) || !isStr(v.weeklyReward)) return null;
  return v as unknown as Level2Rule;
}

function parseLevel3(v: unknown): Level3Rule | null {
  if (!isObj(v) || typeof v.enabled !== 'boolean' || !isStr(v.reward)) return null;
  if (v.target !== '2weeks' && v.target !== 'month') return null;
  return v as unknown as Level3Rule;
}

export function parseRewardRules(input: unknown): RewardRulesConfig | null {
  if (!isObj(input)) return null;
  const level1 = parseLevel1(input.level1);
  const level2 = parseLevel2(input.level2);
  const level3 = parseLevel3(input.level3);
  if (!level1 || !level2 || !level3) return null;
  return { level1, level2, level3 };
}
