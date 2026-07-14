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

const balanceConfig: RewardRulesConfig = {
  daily: { mode: 'balance', goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, balance: { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 } },
  ladder: [{ threshold: 5, reward: 'toy' }],
  paused: false,
};

describe('RewardRulesForm (v2)', () => {
  it('edits the daily reward text', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/daily reward/i), { target: { value: '1 pound' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      daily: expect.objectContaining({ dailyReward: '1 pound' }),
    }));
  });

  it('switches the daily reward type to an earned balance', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/reward type/i), { target: { value: 'balance' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      daily: expect.objectContaining({ mode: 'balance', balance: expect.objectContaining({ unitLabel: 'hours of TV' }) }),
    }));
  });

  it('edits a balance rate field (commits on blur)', () => {
    const { onChange } = setup(balanceConfig);
    const el = screen.getByLabelText(/minutes of practice per unit/i);
    fireEvent.change(el, { target: { value: '30' } });
    fireEvent.blur(el);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      daily: expect.objectContaining({ balance: expect.objectContaining({ minutesPerUnit: 30 }) }),
    }));
  });

  it('lets a number field be cleared and retyped without snapping to the minimum', () => {
    const { onChange } = setup();
    const el = screen.getByLabelText(/minutes of practice per day/i) as HTMLInputElement;
    fireEvent.change(el, { target: { value: '' } });
    expect(el.value).toBe('');
    fireEvent.change(el, { target: { value: '25' } });
    fireEvent.blur(el);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      daily: expect.objectContaining({ goal: expect.objectContaining({ minutes: 25 }) }),
    }));
  });

  it('adds a reward tier ("jump")', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /add a reward/i }));
    const arg = onChange.mock.calls[0][0] as RewardRulesConfig;
    expect(arg.ladder).toHaveLength(2);
  });

  it('edits a tier threshold (blur) and reward', () => {
    const { onChange } = setup(balanceConfig);
    const th = screen.getByLabelText(/after \(days\)/i);
    fireEvent.change(th, { target: { value: '14' } });
    fireEvent.blur(th);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ladder: [expect.objectContaining({ threshold: 14 })],
    }));
    fireEvent.change(screen.getByLabelText(/^reward$/i), { target: { value: 'a bike' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ladder: [expect.objectContaining({ reward: 'a bike' })],
    }));
  });

  it('removes a tier', () => {
    const { onChange } = setup(balanceConfig);
    fireEvent.click(screen.getByRole('button', { name: /remove tier 1/i }));
    const arg = onChange.mock.calls[0][0] as RewardRulesConfig;
    expect(arg.ladder).toHaveLength(0);
  });

  it('toggles the holiday pause', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByLabelText(/pause rewards for a holiday/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ paused: true }));
  });

  it('toggles a times-table focus (targeted practice)', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /focus on the 8 times table/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      daily: expect.objectContaining({ focus: ['table-8'] }),
    }));
  });
});
