// Turns a missed fact into a one-line strategy a child can actually use, so a
// wrong answer teaches a method rather than just showing the number.
import type { Question } from './logic';

function multiplyTip(a: number, b: number, answer: number): string {
  // Try the friendliest operand first — the one with an easy method.
  const has = (n: number) => a === n || b === n;
  const other = (n: number) => (a === n ? b : a);

  if (has(0)) return `Anything × 0 is 0.`;
  if (has(1)) return `× 1 leaves a number unchanged: ${other(1)}.`;
  if (has(10)) return `× 10: just add a zero → ${other(10)}0.`;
  if (has(2)) return `× 2 is doubling: double ${other(2)} is ${answer}.`;
  if (has(5)) return `× 5 is half of × 10: half of ${other(5)}0 is ${answer}.`;
  if (has(9)) return `× 9 = × 10 minus one lot: ${other(9)}0 − ${other(9)} = ${answer}.`;
  if (has(4)) return `× 4 is double–double: ${other(4)} → ${other(4) * 2} → ${answer}.`;
  if (has(11) && other(11) <= 9) return `× 11 for a single digit repeats it: ${other(11)}${other(11)}.`;
  if (has(3)) return `× 3 is double then add one more: ${other(3)}×2 + ${other(3)} = ${answer}.`;
  // Generic build-up from the previous multiple.
  return `${a} × ${b} = ${a} × ${b - 1} + ${a} = ${a * (b - 1)} + ${a} = ${answer}.`;
}

export function strategyFor(q: Question): string {
  if (q.kind === 'unary') {
    if (q.op === 'square') return `${q.operand}² means ${q.operand} × ${q.operand} = ${q.answer}.`;
    return `√${q.operand}: which number times itself makes ${q.operand}? ${q.answer} × ${q.answer} = ${q.operand}.`;
  }
  if (q.op === 'divide') {
    return `${q.operand1} ÷ ${q.operand2}: how many ${q.operand2}s make ${q.operand1}? ${q.operand2} × ${q.answer} = ${q.operand1}.`;
  }
  return multiplyTip(q.operand1, q.operand2, q.answer);
}

// Whether a dot-array visual makes sense for this question (small products).
export function arrayDims(q: Question): { rows: number; cols: number } | null {
  if (q.kind === 'binary' && q.op === 'multiply' && q.operand1 >= 1 && q.operand2 >= 1
      && q.operand1 <= 12 && q.operand2 <= 12) {
    return { rows: q.operand1, cols: q.operand2 };
  }
  if (q.kind === 'unary' && q.op === 'square' && q.operand >= 1 && q.operand <= 12) {
    return { rows: q.operand, cols: q.operand };
  }
  return null;
}
