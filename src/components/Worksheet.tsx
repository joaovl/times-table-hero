import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { getWorksheetPrintFontSize } from '@/lib/typography';

interface WorksheetProps {
  tables: number[];
  operation: 'multiply' | 'divide' | 'both';
  questionCount: number;
  pageCount?: number;
  studentName?: string;
  onBack: () => void;
}

interface Question {
  operand1: number;
  operand2: number;
  operation: 'multiply' | 'divide';
}

// Layout specifications based on A4 calculations:
// A4: 210mm × 297mm, Margins: 15mm all sides, Printable: 180mm × 267mm
// Header: 16mm, Footer: 12mm, Available for questions: 235mm
// 5 columns × 36mm each evenly distributed
// Font sizes derived from shared typography config (main game baseline)
function getLayoutSpec(count: number): { fontSize: string; rowHeight: string; columns: number } {
  const rows = Math.ceil(count / 5);
  const fontSize = getWorksheetPrintFontSize(count);

  // 235mm available (with footer), calculate row height based on rows needed
  if (rows <= 4) return { fontSize, rowHeight: '58.75mm', columns: 5 };     // 20 questions
  if (rows <= 8) return { fontSize, rowHeight: '29.375mm', columns: 5 };    // 40 questions
  if (rows <= 12) return { fontSize, rowHeight: '19.583mm', columns: 5 };   // 60 questions
  if (rows <= 16) return { fontSize, rowHeight: '14.6875mm', columns: 5 };  // 80 questions
  if (rows <= 20) return { fontSize, rowHeight: '11.75mm', columns: 5 };    // 100 questions
  return { fontSize, rowHeight: '9.4mm', columns: 5 };                      // 125 questions max
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
  pageCount = 1,
  studentName,
  onBack,
}: WorksheetProps) {
  // Cap at 100 for even columns (100 / 5 = 20 rows)
  const actualCount = Math.min(questionCount, 100);
  const actualPages = Math.max(1, Math.min(pageCount, 20));

  const pages = useMemo(
    () =>
      Array.from({ length: actualPages }, () =>
        generateQuestions(tables, operation, actualCount)
      ),
    [tables, operation, actualCount, actualPages]
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
        /* Screen styles - match main game area sizing */
        @media screen {
          .worksheet {
            font-size: 16px;
          }
          .worksheet-header .header-title {
            font-size: 1.25rem !important;
          }
          .worksheet-header .header-name {
            font-size: 0.875rem !important;
          }
          .worksheet-header .header-meta {
            font-size: 0.875rem !important;
          }
          .questions-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 0.5rem;
          }
          .question {
            font-size: 1rem !important;
            white-space: nowrap;
          }
          .answer-blank {
            display: inline-block;
            width: 2.5em;
            border-bottom: 1px solid #000;
            margin-left: 0.25em;
            vertical-align: baseline;
          }
          .footer {
            font-size: 1rem !important;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .min-h-screen {
            min-height: 0 !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .worksheet-stack {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            background: #ffffff !important;
          }
          .worksheet {
            width: 180mm !important;
            height: 263mm !important;
            max-width: 180mm !important;
            max-height: 263mm !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: Arial, sans-serif;
            overflow: hidden !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .worksheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
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
            grid-template-columns: repeat(5, 36mm) !important;
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
            white-space: nowrap;
            overflow: hidden;
          }
          .answer-blank {
            display: inline-block;
            width: 10mm;
            border-bottom: 0.3mm solid #000;
            margin-left: 1mm;
            vertical-align: baseline;
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
            {actualPages} {actualPages === 1 ? 'page' : 'pages'} • {actualCount} questions • {Math.ceil(actualCount / 5)} rows × 5 cols • Font: {layout.fontSize}
          </div>
          <Button onClick={handlePrint}>
            Print Worksheet
          </Button>
        </div>
      </div>

      {/* Worksheet preview */}
      <div className="worksheet-stack max-w-3xl mx-auto">
        {pages.map((questions, pageIdx) => (
          <div key={pageIdx} className="worksheet p-8">
            {/* Header - matches main area baseline */}
            <div className="worksheet-header mb-4">
              <div className="header-top flex justify-between items-center border-b border-black pb-2 mb-2">
                <div className="header-title text-lg font-bold">Maths Challenge</div>
                <div className="header-name text-xs">
                  Name: <span className="inline-block border-b border-black w-44">{studentName || ''}</span>
                </div>
              </div>
              <div className="header-meta text-xs text-gray-600">
                <strong>{actualCount} Questions</strong> — Testing: {tablesLabel}
              </div>
            </div>

            {/* Questions grid - matches main area baseline */}
            <div className="questions-grid">
              {questions.map((q, idx) => (
                <div key={idx} className="question text-sm">
                  {q.operand1} {getSymbol(q.operation)} {q.operand2} =<span className="answer-blank">&nbsp;</span>
                </div>
              ))}
            </div>

            {/* Footer - 10mm */}
            <div className="footer text-center text-lg font-bold text-gray-500">
              Good luck!
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
