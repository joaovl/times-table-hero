import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { ArithSettings } from './logic';
import { generateArithQuestions } from './logic';
import { generateArithPdf } from './pdf';

interface Props {
  settings: ArithSettings;
  pageCount: number;
  studentName?: string;
  onBack: () => void;
}

const opLabel = (op: ArithSettings['operation']): string =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : op === 'multiply' ? '×' : '+−×';

const symbol = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : '×';

export function ArithmeticWorksheet({ settings, pageCount, studentName, onBack }: Props) {
  const actualPages = Math.max(1, Math.min(pageCount, 20));
  const pages = useMemo(
    () => Array.from({ length: actualPages }, () => generateArithQuestions(settings, settings.questionCount)),
    [settings, actualPages]
  );
  const previewQuestions = pages[0];
  const subtitle = `${opLabel(settings.operation)} • ${settings.difficulty} • ${
    settings.digitMode.kind === 'exact' ? `exactly ${settings.digitMode.digits}` : `up to ${settings.digitMode.digits}`
  } digits`;

  const handlePrint = () => {
    const doc = generateArithPdf({
      pages,
      title: 'Maths Challenge — Arithmetic',
      subtitle: `${settings.questionCount} Questions — ${subtitle}`,
      studentName,
    });
    doc.save('maths-arithmetic.pdf');
  };

  const md = previewQuestions.reduce(
    (m, q) => Math.max(m, String(q.operand1).length, String(q.operand2).length),
    1
  );
  const cols = md <= 2 ? 4 : md === 3 ? 3 : 2;
  const useColumn = md >= 4;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-background p-4 border-b sticky top-0 z-10 no-print">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <div className="text-sm text-muted-foreground">
            {actualPages} {actualPages === 1 ? 'page' : 'pages'} • {settings.questionCount} questions
          </div>
          <Button onClick={handlePrint}>Download PDF</Button>
        </div>
      </div>

      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-4">
          <div className="flex justify-between items-center border-b border-black pb-2 mb-2">
            <div className="text-lg font-bold">Maths Challenge — Arithmetic</div>
            <div className="text-xs">
              Name: <span className="inline-block border-b border-black w-44">{studentName || ''}</span>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <strong>{settings.questionCount} Questions</strong> — {subtitle}
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {previewQuestions.map((q, idx) =>
            useColumn ? (
              <div key={idx} className="font-mono text-base text-right">
                <div>{q.operand1}</div>
                <div>{symbol(q.op)} {q.operand2}</div>
                <div className="border-t border-black mt-1">&nbsp;</div>
              </div>
            ) : (
              <div key={idx} className="text-sm whitespace-nowrap">
                {q.operand1} {symbol(q.op)} {q.operand2} = <span className="inline-block border-b border-black w-10">&nbsp;</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
