import type { Env } from '../../_lib/auth/types';
import type { RewardRules } from '../../_lib/rewards/types';
import { json, error } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { getKid } from '../../_lib/kids/repo';
import { listRules } from '../../_lib/rules/repo';
import { resolveEffective } from '../../_lib/rules/effective';
import { listSessions } from '../../_lib/sessions/repo';
import { computeBalance } from '../../_lib/rewards/balance';
import { evaluate } from '../../_lib/rewards';

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

  const l1 = rule.level1;
  if (l1.mode === 'balance') {
    const { balanceUnits, days } = computeBalance(
      { goal: l1.goal, score: l1.score, weakTopics: l1.weakTopics },
      l1.balance,
      sessions,
      now,
      tz,
    );
    return json({ mode: 'balance', unitLabel: l1.balance.unitLabel, balanceUnits, days });
  }

  const result = evaluate({ ...rule, timezoneOffsetMinutes: tz } as RewardRules, sessions, now);
  return json({ mode: 'fixed', earned: result.earned, days: result.days });
}
