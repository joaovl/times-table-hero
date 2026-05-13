// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { MultiFieldInput } from './MultiFieldInput';

afterEach(cleanup);

// Minimal controlled host so we exercise the real onChange + state path
// the production parents use. The host owns a form so we can assert that
// Enter on the LAST field triggers form submission while Enter on a
// non-last field DOES NOT (it must just move focus).
function Host({ onSubmit }: { onSubmit: () => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <MultiFieldInput
        fields={[
          { value: a, onChange: setA, ariaLabel: 'Numerator', autoFocus: true },
          { value: b, onChange: setB, ariaLabel: 'Denominator' },
        ]}
        separators={['/']}
      />
      <button type="submit">Check</button>
    </form>
  );
}

describe('<MultiFieldInput>', () => {
  it('renders one input per field plus N-1 visual separators', () => {
    render(
      <form>
        <MultiFieldInput
          fields={[
            { value: '', onChange: () => {}, ariaLabel: 'A' },
            { value: '', onChange: () => {}, ariaLabel: 'B' },
            { value: '', onChange: () => {}, ariaLabel: 'C' },
          ]}
          separators={[',', ',']}
        />
      </form>
    );
    expect(screen.getByLabelText('A')).toBeInTheDocument();
    expect(screen.getByLabelText('B')).toBeInTheDocument();
    expect(screen.getByLabelText('C')).toBeInTheDocument();
    expect(screen.getAllByText(',')).toHaveLength(2);
  });

  it('Enter on a non-last field advances focus and selects the next input without submitting', () => {
    const onSubmit = vi.fn();
    render(<Host onSubmit={onSubmit} />);
    const num = screen.getByLabelText('Numerator') as HTMLInputElement;
    const den = screen.getByLabelText('Denominator') as HTMLInputElement;

    // Type "3" into the first field, then Enter — focus must move to the
    // second field and the form must NOT submit.
    fireEvent.change(num, { target: { value: '3' } });
    expect(num.value).toBe('3');
    fireEvent.keyDown(num, { key: 'Enter', code: 'Enter' });
    expect(document.activeElement).toBe(den);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter on the last field falls through to the form's onSubmit handler", () => {
    const onSubmit = vi.fn();
    render(<Host onSubmit={onSubmit} />);
    const num = screen.getByLabelText('Numerator') as HTMLInputElement;
    const den = screen.getByLabelText('Denominator') as HTMLInputElement;

    // Move focus and type into the second field.
    fireEvent.change(num, { target: { value: '3' } });
    fireEvent.keyDown(num, { key: 'Enter', code: 'Enter' });
    fireEvent.change(den, { target: { value: '4' } });

    // Submit-by-Enter: jsdom requires explicit form submit because keyDown
    // on a number input does not synthesise the native default. We assert
    // that MultiFieldInput did NOT call preventDefault for the last
    // field, which is what allows the native form submission to fire.
    const enterOnLast = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    den.dispatchEvent(enterOnLast);
    expect(enterOnLast.defaultPrevented).toBe(false);

    // Belt-and-braces: trigger the form submit directly and confirm the
    // host's onSubmit fires.
    fireEvent.submit(den.closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('typing in a field calls the field-level onChange with the new value', () => {
    const onChangeA = vi.fn();
    render(
      <form>
        <MultiFieldInput
          fields={[
            { value: '', onChange: onChangeA, ariaLabel: 'A' },
            { value: '', onChange: () => {}, ariaLabel: 'B' },
          ]}
          separators={['/']}
        />
      </form>
    );
    fireEvent.change(screen.getByLabelText('A'), { target: { value: '7' } });
    expect(onChangeA).toHaveBeenCalledWith('7');
  });
});
