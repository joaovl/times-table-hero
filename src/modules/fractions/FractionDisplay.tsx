import { cn } from '@/lib/utils';
import type { Frac } from './logic';

interface Props {
  frac: Frac;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Renders the fraction as numerator over horizontal rule over denominator,
// right-stacked and vertically centred. Used in setup previews, on-screen
// play, and results. PDF re-implements this shape with jsPDF primitives.
const SIZE_CLASSES: Record<NonNullable<Props['size']>, { num: string; den: string; bar: string; pad: string }> = {
  sm: { num: 'text-lg md:text-xl', den: 'text-lg md:text-xl', bar: 'border-t-[2px]', pad: 'px-1' },
  md: { num: 'text-3xl md:text-4xl', den: 'text-3xl md:text-4xl', bar: 'border-t-[3px]', pad: 'px-1.5' },
  lg: { num: 'text-5xl md:text-6xl', den: 'text-5xl md:text-6xl', bar: 'border-t-[4px]', pad: 'px-2' },
};

export function FractionDisplay({ frac, size = 'md', className }: Props) {
  const c = SIZE_CLASSES[size];
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center leading-none align-middle font-extrabold',
        c.pad,
        className
      )}
      aria-label={`${frac.num} over ${frac.den}`}
    >
      <span className={cn(c.num, 'pb-1')}>{frac.num}</span>
      <span className={cn(c.bar, 'border-current w-full')} />
      <span className={cn(c.den, 'pt-1')}>{frac.den}</span>
    </div>
  );
}
