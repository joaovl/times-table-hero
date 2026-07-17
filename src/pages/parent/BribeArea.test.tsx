// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

// BribeArea renders a react-router <Link> (back to the parent area), so it must
// be rendered inside a router in tests.
const renderBribeArea = () => render(<BribeArea />, { wrapper: MemoryRouter });

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
    renderBribeArea();
    // The form is gated behind the initial load; wait for it before editing.
    fireEvent.change(await screen.findByLabelText(/daily reward/i), { target: { value: '2 stickers' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(rulesPut).toHaveBeenCalledWith(null, expect.objectContaining({
      daily: expect.objectContaining({ dailyReward: '2 stickers' }),
    })));
  });

  it('lists kids as scope options', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    rulesList.mockResolvedValue([]);
    renderBribeArea();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sam' })).toBeInTheDocument());
  });
});
