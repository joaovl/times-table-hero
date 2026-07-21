// Verifies every module's e2e oracle against the registry adapter (the single
// source of truth for correct answers). For each module that has rolled out an
// oracle, we generate questions, compute the choices the Play would show, call
// the module's oracle, and assert its `expected` (and `correctChoice`) actually
// grade correct. This catches an oracle that reports the wrong answer — which
// would silently make the e2e auto-player pass on a broken module.
import { describe, it, expect } from 'vitest';
import type { OracleData } from './oracle';
import { ALL_MODULES } from '@/lib/testkit/registry';

import { chartOracle } from '@/modules/charts/oracle';
import { timesTablesOracle } from '@/modules/times-tables/oracle';
import { arithmeticOracle } from '@/modules/arithmetic/oracle';
import { numberSenseOracle } from '@/modules/number-sense/oracle';
import { conversionsOracle } from '@/modules/conversions/oracle';
import { wordProblemsOracle } from '@/modules/word-problems/oracle';
import { algebraOracle } from '@/modules/algebra/oracle';
import { statisticsOracle } from '@/modules/statistics/oracle';
import { ratioProportionOracle } from '@/modules/ratio-proportion/oracle';
import { timeOracle } from '@/modules/time/oracle';
import { numberTheoryOracle } from '@/modules/number-theory/oracle';
import { moneyOracle } from '@/modules/money/oracle';
import { decimalsOracle } from '@/modules/decimals/oracle';
import { fractionsOracle } from '@/modules/fractions/oracle';
import { shapesOracle } from '@/modules/shapes/oracle';

// slug -> oracle(question, choicesShown) => OracleData. Modules are added here
// as their oracle lands; modules absent from this map are simply not yet
// rolled out (the e2e auto-player skips them). The complex multi-field / pick
// modules (decimals, fractions, shapes, money) stay covered by the Layer 1
// answer-integrity net rather than the auto-player.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ORACLES: Record<string, (q: any, choices: string[]) => OracleData> = {
  charts: chartOracle,
  'times-tables': timesTablesOracle,
  arithmetic: arithmeticOracle,
  'number-sense': numberSenseOracle,
  conversions: conversionsOracle,
  'word-problems': wordProblemsOracle,
  algebra: algebraOracle,
  statistics: statisticsOracle,
  'ratio-proportion': ratioProportionOracle,
  time: (q) => timeOracle(q),
  'number-theory': (q) => numberTheoryOracle(q),
  money: (q) => moneyOracle(q),
  decimals: (q) => decimalsOracle(q),
  fractions: (q) => fractionsOracle(q),
  shapes: shapesOracle,
};

const K = 20;

for (const m of ALL_MODULES) {
  const oracle = ORACLES[m.slug];
  if (!oracle) continue;
  describe(`oracle: ${m.slug}`, () => {
    for (const skill of m.skills) {
      it(`"${skill}" reports an answer that grades correct`, () => {
        for (const q of m.generate(m.settingsFor(skill), K)) {
          const choices = m.choices(q);
          const o = oracle(q, choices);
          expect(o.expected, `${m.slug}/${skill} empty expected`).toBeTruthy();
          expect(
            m.isCorrect(q, o.expected),
            `${m.slug}/${skill} oracle.expected "${o.expected}" is not accepted: ${JSON.stringify(q)}`,
          ).toBe(true);
          if (o.inputMode === 'choices') {
            expect(o.choices, `${m.slug}/${skill} choices missing`).toBeTruthy();
            expect(o.choices).toContain(o.correctChoice);
            expect(m.isCorrect(q, o.correctChoice ?? '')).toBe(true);
          }
        }
      });
    }
  });
}

it('at least one oracle is under test', () => {
  expect(Object.keys(ORACLES).length).toBeGreaterThan(0);
});
