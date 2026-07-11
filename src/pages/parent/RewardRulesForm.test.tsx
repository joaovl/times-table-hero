// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RewardRulesForm from './RewardRulesForm';
import { DEFAULT_RULES, type RewardRulesConfig } from '@/lib/rewards-types';

afterEach(() => cleanup());

function setup(initial: RewardRulesConfig = DEFAULT_RULES) {
  const onChange = vi.fn();
  render(<RewardRulesForm value={initial} onChange={onChange} />);
  return { onChange };
}

describe('RewardRulesForm', () => {
  it('edits the daily reward text', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/daily reward/i), { target: { value: '1 pound' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ dailyReward: '1 pound' }),
    }));
  });

  it('edits the weekly success-days number', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/successful days per week/i), { target: { value: '6' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level2: expect.objectContaining({ successDaysRequired: 6 }),
    }));
  });

  it('toggles the extended reward on', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByLabelText(/enable a bigger reward/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level3: expect.objectContaining({ enabled: true }),
    }));
  });

  it('switches the score type to a rolling average', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/score requirement/i), { target: { value: 'lastNAverage' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ score: expect.objectContaining({ kind: 'lastNAverage' }) }),
    }));
  });
});
