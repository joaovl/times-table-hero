import type { RulesRow } from './repo';
import type { RewardRulesConfig } from './types';

/** The rule that governs a kid: their own row if present, else the all-kids
 *  (kid_id NULL) row, else none. */
export function resolveEffective(rows: RulesRow[], kidId: string): RewardRulesConfig | null {
  const perKid = rows.find(r => r.kidId === kidId);
  if (perKid) return perKid.config;
  const allKids = rows.find(r => r.kidId === null);
  return allKids ? allKids.config : null;
}
