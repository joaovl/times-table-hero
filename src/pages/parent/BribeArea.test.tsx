// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const rulesList = vi.fn();
const rulesPut = vi.fn();
vi.mock('@/lib/api/client', () => ({
  kidsList: (...a: unknown[]) => kidsList(...a),
  rulesList: (...a: unknown[]) => rulesList(...a),
  rulesPut: (...a: unknown[]) => rulesPut(...a),
}));

import BribeArea from './BribeArea';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('BribeArea', () => {
  it('loads existing all-kids rules and saves edits', async () => {
    kidsList.mockResolvedValue([]);
    rulesList.mockResolvedValue([]);
    rulesPut.mockResolvedValue(undefined);
    render(<BribeArea />);
    await waitFor(() => expect(rulesList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/daily reward/i), { target: { value: '2 stickers' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(rulesPut).toHaveBeenCalledWith(null, expect.objectContaining({
      level1: expect.objectContaining({ dailyReward: '2 stickers' }),
    })));
  });

  it('lists kids as scope options', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    rulesList.mockResolvedValue([]);
    render(<BribeArea />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sam' })).toBeInTheDocument());
  });
});
