import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  initialPageCount: number;
  initialQuestionsPerPage: number;
  pageCountOptions: number[];
  questionsPerPageOptions: number[];
  onDownload: (pageCount: number, questionsPerPage: number, name: string) => void;
}

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg min-h-[44px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

export function PrintWorksheetModal({
  isOpen,
  onClose,
  defaultName = '',
  initialPageCount,
  initialQuestionsPerPage,
  pageCountOptions,
  questionsPerPageOptions,
  onDownload,
}: Props) {
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [questionsPerPage, setQuestionsPerPage] = useState(initialQuestionsPerPage);
  const [name, setName] = useState(defaultName);
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPageCount(initialPageCount);
      setQuestionsPerPage(initialQuestionsPerPage);
      setName(defaultName);
      setJustDownloaded(false);
    }
  }, [isOpen, initialPageCount, initialQuestionsPerPage, defaultName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    onDownload(pageCount, questionsPerPage, name);
    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 1500);
  };

  const total = pageCount * questionsPerPage;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
    >
      <div
        className="bg-card rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md p-5 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="print-modal-title" className="text-lg md:text-xl font-bold text-foreground mb-4">
          Print Worksheet
        </h2>

        <div className="mb-3">
          <p className="text-xs md:text-sm text-muted-foreground mb-2">Pages</p>
          <div className="grid grid-cols-5 gap-1.5">
            {pageCountOptions.map(n => (
              <button key={n} onClick={() => setPageCount(n)} className={buttonClass(pageCount === n)}>
                <span className="text-[15px] md:text-[16px]">{n}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs md:text-sm text-muted-foreground mb-2">Questions per page</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questionsPerPageOptions.map(n => (
              <button
                key={n}
                onClick={() => setQuestionsPerPage(n)}
                className={buttonClass(questionsPerPage === n)}
              >
                <span className="text-[15px] md:text-[16px]">{n}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="print-name" className="text-xs md:text-sm text-muted-foreground mb-1 block">
            Name on header (optional)
          </label>
          <input
            id="print-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-card-border bg-background text-foreground"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center mb-4">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'} × {questionsPerPage} ={' '}
          <strong>{total} problems</strong>
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose} className="font-bold">
            Close
          </Button>
          <Button
            onClick={handleDownload}
            className={cn(
              'font-bold shadow-button bg-gradient-to-b from-primary via-primary/85 to-primary/65',
              justDownloaded && 'animate-pop'
            )}
          >
            {justDownloaded ? 'Downloaded ✓' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
