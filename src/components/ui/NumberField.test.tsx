// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NumberField } from './NumberField';

afterEach(() => cleanup());

describe('NumberField', () => {
  it('can be fully cleared while typing (no per-keystroke clamp) and commits on blur', () => {
    const onCommit = vi.fn();
    render(<NumberField aria-label="days" value={15} min={1} onCommit={onCommit} />);
    const el = screen.getByLabelText('days') as HTMLInputElement;
    fireEvent.change(el, { target: { value: '' } });
    expect(el.value).toBe('');            // stays empty — you can retype
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(el, { target: { value: '20' } });
    fireEvent.blur(el);
    expect(onCommit).toHaveBeenCalledWith(20);
  });

  it('clamps to min/max on commit and rounds to an integer', () => {
    const onCommit = vi.fn();
    render(<NumberField aria-label="pct" value={80} min={0} max={100} onCommit={onCommit} />);
    const el = screen.getByLabelText('pct');
    fireEvent.change(el, { target: { value: '150.7' } });
    fireEvent.blur(el);
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it('reverts to the last value when left empty or invalid', () => {
    const onCommit = vi.fn();
    render(<NumberField aria-label="n" value={5} min={1} onCommit={onCommit} />);
    const el = screen.getByLabelText('n') as HTMLInputElement;
    fireEvent.change(el, { target: { value: 'abc' } });
    fireEvent.blur(el);
    expect(el.value).toBe('5');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
