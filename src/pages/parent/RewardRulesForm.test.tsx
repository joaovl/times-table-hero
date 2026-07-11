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

  it('exposes an editable N when the score is a rolling average', () => {
    const rolling: RewardRulesConfig = {
      ...DEFAULT_RULES,
      level1: { ...DEFAULT_RULES.level1, score: { kind: 'lastNAverage', n: 2, minPercent: 100 } },
    };
    const { onChange } = setup(rolling);
    fireEvent.change(screen.getByLabelText(/number of recent exercises/i), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ score: expect.objectContaining({ kind: 'lastNAverage', n: 3 }) }),
    }));
  });

  it('hides the N field for the daily-percent score', () => {
    setup(); // DEFAULT_RULES uses dailyPercent
    expect(screen.queryByLabelText(/number of recent exercises/i)).toBeNull();
  });

  it('switches the reward type to an earned balance', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/reward type/i), { target: { value: 'balance' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ mode: 'balance', balance: expect.objectContaining({ unitLabel: 'hours of TV' }) }),
    }));
  });

  it('edits the balance rate fields when in balance mode', () => {
    const balance: RewardRulesConfig = {
      ...DEFAULT_RULES,
      level1: {
        mode: 'balance',
        goal: { minutes: 20 },
        score: { kind: 'dailyPercent', minPercent: 50 },
        balance: { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 },
      },
    };
    const { onChange } = setup(balance);
    expect(screen.getByLabelText(/reward unit/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/minutes of practice per unit/i), { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ balance: expect.objectContaining({ minutesPerUnit: 30 }) }),
    }));
  });

  it('hides the balance fields in fixed mode', () => {
    setup(); // DEFAULT_RULES is fixed
    expect(screen.queryByLabelText(/reward unit/i)).toBeNull();
  });
});
