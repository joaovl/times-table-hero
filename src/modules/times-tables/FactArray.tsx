import { arrayDims } from './strategy';
import type { Question } from './logic';

// A dot array (rows × cols) that shows a multiplication fact as a picture:
// "7 × 8" is 7 rows of 8 dots. Grounds the number in a quantity the child can
// see and count. Renders nothing for facts that don't map to a small array.
export function FactArray({ q }: { q: Question }) {
  const dims = arrayDims(q);
  if (!dims) return null;
  const { rows, cols } = dims;
  return (
    <div
      className="mt-3 inline-grid gap-[3px] md:gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`${rows} rows of ${cols} — ${rows * cols} in total`}
    >
      {Array.from({ length: rows * cols }, (_, i) => (
        <span key={i} className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-primary/70" />
      ))}
    </div>
  );
}
