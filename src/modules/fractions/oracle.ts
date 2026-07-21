import type { OracleData } from '@/lib/e2e/oracle';
import { answerToImproper, type FractionQuestion } from './logic';

const OP = new Set(['add-same', 'sub-same', 'add-diff', 'sub-diff']);
const FRAC_EQ = new Set(['id', 'mul-frac', 'div-frac-whole']);

// Canonical answer per fraction skill (mirrors FractionsPlay / the testkit
// adapter). Mixed-payload answers are expressed as an improper fraction "n/d".
export function fractionsOracle(q: FractionQuestion): OracleData {
  const s = q.skill;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qq = q as any;
  let expected: string;
  if (OP.has(s) || FRAC_EQ.has(s)) expected = `${qq.answer.num}/${qq.answer.den}`;
  else if (s === 'from-decimal') expected = `${qq.num}/${qq.den}`;
  else if (s === 'mixed') expected = `${qq.improper.num}/${qq.improper.den}`;
  else if (s === 'eq') expected = String(qq.answer);
  else if (s === 'cmp') expected = String(qq.answer);
  else if (s === 'to-decimal') expected = String(qq.answer);
  else {
    const imp = answerToImproper(qq.answer);
    expected = `${imp.num}/${imp.den}`;
  }
  return { questionId: JSON.stringify(q), expected, inputMode: 'typed', highlightCount: 0 };
}
