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
    dashboardGet.mockResolvedValue({ mode: 'balance', unitLabel: 'hours of TV', balanceUnits: 3, days: [] });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/3 hours of TV/)).toBeInTheDocument());
    expect(dashboardGet).toHaveBeenCalledWith('k1');
  });

  it('prompts to add a kid when there are none', async () => {
    kidsList.mockResolvedValue([]);
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/add a kid first/i)).toBeInTheDocument());
  });
});
