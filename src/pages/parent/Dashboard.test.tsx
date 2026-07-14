// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const dashboardGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
  kidsList: (...a: unknown[]) => kidsList(...a),
  dashboardGet: (...a: unknown[]) => dashboardGet(...a),
}));

import Dashboard from './Dashboard';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('Dashboard', () => {
  it('shows the earned balance for a balance-mode kid', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Mia', color: 'blue', icon: 'star' }]);
    dashboardGet.mockResolvedValue({
      mode: 'balance', unitLabel: 'hours of TV', balanceUnits: 3,
      totalSuccessfulDays: 4, paused: false,
      tiers: [{ threshold: 3, reward: 'sticker', earned: true }, { threshold: 7, reward: 'toy', earned: false }],
      days: [],
    });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/3 hours of TV/)).toBeInTheDocument());
    expect(dashboardGet).toHaveBeenCalledWith('k1');
    // ladder progress is shown
    expect(screen.getByText(/Successful days so far/i)).toBeInTheDocument();
    expect(screen.getByText(/3 days → sticker — earned!/)).toBeInTheDocument();
    expect(screen.getByText(/7 days → toy/)).toBeInTheDocument();
  });

  it('prompts to add a kid when there are none', async () => {
    kidsList.mockResolvedValue([]);
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/add a kid first/i)).toBeInTheDocument());
  });
});
