import { useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface WorksheetProps {
  tables: number[];
  operation: 'multiply' | 'divide' | 'both';
  questionCount: number;
  studentName?: string;
  onBack: () => void;
}

interface Question {
  operand1: number;
  operand2: number;
  operation: 'multiply' | 'divide';
}

// Layout specifications based on A4 calculations:
// A4: 210mm × 297mm, Left margin: 12mm, Right margin: 3mm, Printable: 195mm × 277mm
// Header: 16mm, Footer: 12mm, Available for questions: 235mm
// 5 columns × 39mm each evenly distributed
function getLayoutSpec(count: number): { fontSize: string; rowHeight: string; columns: number } {
  const rows = Math.ceil(count / 5);

  // 235mm available (with footer), calculate row height based on rows needed
  if (rows <= 4) return { fontSize: '18pt', rowHeight: '58.75mm', columns: 5 };     // 20 questions
  if (rows <= 8) return { fontSize: '17pt', rowHeight: '29.375mm', columns: 5 };    // 40 questions
  if (rows <= 12) return { fontSize: '16pt', rowHeight: '19.583mm', columns: 5 };   // 60 questions
  if (rows <= 16) return { fontSize: '15pt', rowHeight: '14.6875mm', columns: 5 };  // 80 questions
  if (rows <= 20) return { fontSize: '14pt', rowHeight: '11.75mm', columns: 5 };    // 100 questions
  return { fontSize: '13pt', rowHeight: '9.4mm', columns: 5 };                      // 125 questions max
}

function generateQuestions(
  tables: number[],
  operation: 'multiply' | 'divide' | 'both',
  count: number
): Question[] {
  // First, generate ALL possible unique questions
  const allQuestions: Question[] = [];
  const divisionTables = tables.filter(t => t !== 0);

  // Generate multiplication questions
  if (operation === 'multiply' || operation === 'both') {
    for (const table of tables) {
      for (let other = 0; other <= 12; other++) {
        allQuestions.push({
          operand1: table,
          operand2: other,
          operation: 'multiply',
        });
      }
    }
  }

  // Generate division questions
  if (operation === 'divide' || operation === 'both') {
    for (const table of divisionTables) {
      for (let other = 0; other <= 12; other++) {
        const product = table * other;
        allQuestions.push({
          operand1: product,
          operand2: table,
          operation: 'divide',
        });
      }
    }
  }

  // Shuffle all questions
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }

  // If we need more questions than unique ones available, repeat the pool
  const questions: Question[] = [];
  while (questions.length < count) {
    const remaining = count - questions.length;
    const toAdd = allQuestions.slice(0, Math.min(remaining, allQuestions.length));
    questions.push(...toAdd);

    // Reshuffle for variety if we need to repeat
    if (questions.length < count) {
      for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
      }
    }
  }

  return questions.slice(0, count);
}

export function Worksheet({
  tables,
  operation,
  questionCount,
  studentName,
  onBack,
}: WorksheetProps) {
  // Cap at 100 for even columns (100 / 5 = 20 rows)
  const actualCount = Math.min(questionCount, 100);

  const questions = useMemo(
    () => generateQuestions(tables, operation, actualCount),
    [tables, operation, actualCount]
  );

  const layout = getLayoutSpec(actualCount);

  const handlePrint = () => {
    window.print();
  };

  const getSymbol = (op: 'multiply' | 'divide') => op === 'multiply' ? '×' : '÷';

  const sortedTables = [...tables].sort((a, b) => a - b);
  const tablesLabel = sortedTables.map(t => `${t}${operation === 'divide' ? '÷' : '×'}`).join(', ');

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        /* Screen styles */
        .worksheet-header .header-title {
          font-size: 18px;
        }
        .worksheet-header .header-name {
          font-size: 12px;
        }
        .worksheet-header .header-meta {
          font-size: 10px;
        }
        .questions-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
        }
        .question {
          font-size: calc(${layout.fontSize} - 2pt);
        }
        .footer {
          font-size: 16px;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 3mm 10mm 12mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .worksheet, .worksheet * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .worksheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 195mm !important;
            height: 263mm !important;
            max-width: 195mm !important;
            max-height: 263mm !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: Arial, sans-serif;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .worksheet-header {
            height: 16mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            background: #ffffff !important;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 0.5mm solid #000;
            padding-bottom: 1.5mm;
            margin-bottom: 1.5mm;
            background: #ffffff !important;
          }
          .header-title {
            font-size: 15pt;
            font-weight: bold;
          }
          .header-name {
            font-size: 10pt;
          }
          .header-meta {
            font-size: 8.5pt;
            color: #333;
          }
          .questions-grid {
            display: grid;
            grid-template-columns: repeat(5, 39mm) !important;
            grid-auto-flow: row;
            height: 235mm;
            max-height: 235mm;
            margin: 0;
            padding: 0;
            gap: 0;
            background: #ffffff !important;
            overflow: hidden;
          }
          .question {
            font-size: ${layout.fontSize};
            height: ${layout.rowHeight};
            max-height: ${layout.rowHeight};
            display: flex;
            align-items: center;
            font-family: Arial, sans-serif;
            background: #ffffff !important;
            margin: 0;
            padding: 0;
          }
          .footer {
            height: 12mm;
            max-height: 12mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16pt;
            font-weight: bold;
            color: #000;
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Screen controls */}
      <div className="no-print bg-background p-4 border-b sticky top-0 z-10">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div className="text-sm text-muted-foreground">
            {actualCount} questions • {Math.ceil(actualCount / 5)} rows × 5 cols • Font: {layout.fontSize}
          </div>
          <Button onClick={handlePrint}>
            Print Worksheet
          </Button>
        </div>
      </div>

      {/* Worksheet preview */}
      <div className="worksheet p-8 max-w-3xl mx-auto">
        {/* Header - 23mm */}
        <div className="worksheet-header mb-4">
          <div className="header-top flex justify-between items-center border-b border-black pb-2 mb-2">
            <div className="header-title text-xl font-bold">Maths Challenge</div>
            <div className="header-name text-sm">
              Name: <span className="inline-block border-b border-black w-44">{studentName || ''}</span>
            </div>
          </div>
          <div className="header-meta text-xs text-gray-600">
            <strong>{actualCount} Questions</strong> — Testing: {tablesLabel}
          </div>
        </div>

        {/* Questions grid - 234mm available, 5 columns evenly distributed */}
        <div className="questions-grid"
        >
          {questions.map((q, idx) => (
            <div key={idx} className="question">
              {q.operand1} {getSymbol(q.operation)} {q.operand2} = _____
            </div>
          ))}
        </div>

        {/* Footer - 10mm */}
        <div className="footer text-center text-lg font-bold text-gray-500">
          Good luck!
        </div>
      </div>
    </div>
  );
}
