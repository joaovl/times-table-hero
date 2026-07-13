import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
  onCommit: (n: number) => void;
}

/**
 * An integer input that lets the user clear and type the whole number freely,
 * then validates/clamps on blur (or Enter) — instead of coercing every
 * keystroke, which made fields impossible to edit. If the entry is empty or not
 * a number on commit, it reverts to the last valid value.
 */
export function NumberField({ id, value, min, max, placeholder, className, onCommit, ...rest }: Props) {
  const [raw, setRaw] = useState(String(value));
  const focused = useRef(false);

  // Keep in sync with external changes (mode switch, scope change, reload) —
  // but never yank the value out from under the user while they're typing.
  useEffect(() => {
    if (!focused.current) setRaw(String(value));
  }, [value]);

  const commit = () => {
    focused.current = false;
    const n = Number(raw.trim());
    if (raw.trim() === '' || !Number.isFinite(n)) {
      setRaw(String(value)); // revert
      return;
    }
    let next = Math.round(n);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setRaw(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={raw}
      placeholder={placeholder}
      className={className}
      aria-label={rest['aria-label']}
      onFocus={() => { focused.current = true; }}
      onChange={e => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
