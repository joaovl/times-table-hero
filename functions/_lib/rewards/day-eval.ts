import type { Level1Rule, PracticeSession } from './types';

const pct = (correct: number, total: number): number =>
  total === 0 ? 0 : (correct / total) * 100;

function goalMet(day: PracticeSession[], goal: Level1Rule['goal']): boolean {
  const minutes = day.reduce((s, x) => s + x.durationSec, 0) / 60;
  const exercises = day.reduce((s, x) => s + x.total, 0);
  const sessions = day.length;
  if (goal.minutes !== undefined && minutes < goal.minutes) return false;
  if (goal.exercises !== undefined && exercises < goal.exercises) return false;
  if (goal.sessions !== undefined && sessions < goal.sessions) return false;
  return true;
}

function scoreMet(day: PracticeSession[], score: Level1Rule['score']): boolean {
  if (score.kind === 'dailyPercent') {
    const correct = day.reduce((s, x) => s + x.correct, 0);
    const total = day.reduce((s, x) => s + x.total, 0);
    return pct(correct, total) >= score.minPercent;
  }
  // lastNAverage: mean of the last N sessions' percentages (by startedAt).
  const ordered = [...day].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const lastN = ordered.slice(-score.n); // when fewer than N sessions present, averages all of them
  const avg = lastN.reduce((s, x) => s + pct(x.correct, x.total), 0) / lastN.length;
  return avg >= score.minPercent;
}

function weakMet(day: PracticeSession[], weak: NonNullable<Level1Rule['weakTopics']>): boolean {
  const touching = day.filter(s => s.topics.some(t => weak.topics.includes(t)));
  if (touching.length === 0) return true; // not practised → not applicable
  const correct = touching.reduce((s, x) => s + x.correct, 0);
  const total = touching.reduce((s, x) => s + x.total, 0);
  return pct(correct, total) >= weak.minPercent;
}

export function isDaySuccess(daySessions: PracticeSession[], rule: Level1Rule): boolean {
  if (daySessions.length === 0) return false;
  if (!goalMet(daySessions, rule.goal)) return false;
  if (!scoreMet(daySessions, rule.score)) return false;
  if (rule.weakTopics && !weakMet(daySessions, rule.weakTopics)) return false;
  return true;
}
