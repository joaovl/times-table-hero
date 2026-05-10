import type { Question } from '@/lib/gameLogic';

interface Props {
  q: Question;
  className?: string;
}

export function QuestionDisplay({ q, className }: Props) {
  if (q.kind === 'binary') {
    const sym = q.op === 'multiply' ? '×' : '÷';
    return (
      <span className={className}>
        {q.operand1} {sym} {q.operand2}
      </span>
    );
  }

  if (q.op === 'square') {
    return (
      <span className={className}>
        {q.operand}
        <sup className="text-[0.6em] relative -top-[0.4em] ml-0.5">2</sup>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline ${className ?? ''}`}>
      <span className="text-[0.95em] leading-none">√</span>
      <span className="border-t-[0.12em] border-current pt-[0.05em] px-[0.1em]">
        {q.operand}
      </span>
    </span>
  );
}
