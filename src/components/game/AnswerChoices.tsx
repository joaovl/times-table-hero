import { Button } from '@/components/ui/button';

interface Props {
  options: string[];
  onChoose: (value: string) => void;
}

// Multiple-choice answer buttons shown on easy/medium. Two-column grid so
// longer value strings (money, ratios, times) stay readable on a phone.
export function AnswerChoices({ options, onChoose }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-2 md:gap-x-4 gap-y-2 md:gap-y-[13px]">
      {options.map((option, idx) => (
        <Button
          key={`${option}-${idx}`}
          onClick={() => onChoose(option)}
          variant="outline"
          aria-label={`Answer ${option}`}
          className="h-12 md:h-[64px] px-2 text-xl md:text-2xl font-bold break-words transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground active:scale-95"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
