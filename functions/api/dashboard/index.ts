import type { Env } from '../../_lib/auth/types';
import { json, error } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { getKid } from '../../_lib/kids/repo';
import { listRules } from '../../_lib/rules/repo';
import { resolveEffective } from '../../_lib/rules/effective';
import { listSessions } from '../../_lib/sessions/repo';
import { computeLadder } from '../../_lib/rewards/ladder';
import { computeBalance } from '../../_lib/rewards/balance';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const kidId = new URL(ctx.request.url).searchParams.get('kidId');
  if (!kidId) return error(400, 'invalid_input');
  if (!(await getKid(ctx.env.DB, account.id, kidId))) return error(404, 'kid_not_found');

  const rule = resolveEffective(await listRules(ctx.env.DB, account.id), kidId);
  const sessions = await listSessions(ctx.env.DB, kidId);
  const now = new Date();
  const tz = account.tzOffsetMin;

  if (!rule) return json({ mode: 'none' });

  const daily = rule.daily;
  const gate = { goal: daily.goal, score: daily.score, weakTopics: daily.weakTopics, focus: daily.focus };
  const ladderRes = computeLadder({ gate, sessions, now, tzOffsetMinutes: tz, ladder: rule.ladder, paused: rule.paused });
  const base = {
    totalSuccessfulDays: ladderRes.totalSuccessfulDays,
    tiers: ladderRes.tiers,
    days: ladderRes.days,
    paused: rule.paused,
  };

  if (daily.mode === 'balance' && daily.balance) {
    const bal = computeBalance(
      { goal: daily.goal, score: daily.score, weakTopics: daily.weakTopics },
      daily.balance, sessions, now, tz, rule.paused,
    );
    return json({ mode: 'balance', unitLabel: daily.balance.unitLabel, balanceUnits: bal.balanceUnits, ...base });
  }
  return json({ mode: 'fixed', dailyReward: daily.dailyReward ?? '', ...base });
}
