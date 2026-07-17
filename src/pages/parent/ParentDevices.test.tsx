// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const pairList = vi.fn();
const pairRevoke = vi.fn();
vi.mock('@/lib/api/client', () => ({
  pairList: (...a: unknown[]) => pairList(...a),
  pairRevoke: (...a: unknown[]) => pairRevoke(...a),
  ApiError: class extends Error { code = 'x'; },
}));

import ParentDevices from './ParentDevices';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const devices = [
  { tokenHashPrefix: 'abc12345', label: 'iPad', createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-06-01T00:00:00.000Z' },
  { tokenHashPrefix: 'def67890', label: 'Kindle', createdAt: '2026-02-01T00:00:00.000Z', expiresAt: '2026-07-01T00:00:00.000Z' },
];

describe('ParentDevices', () => {
  it('lists paired devices', async () => {
    pairList.mockResolvedValue(devices);
    render(<MemoryRouter><ParentDevices /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('iPad')).toBeInTheDocument());
    expect(screen.getByText('Kindle')).toBeInTheDocument();
  });

  it('revokes a device and refreshes the list', async () => {
    pairList.mockResolvedValueOnce(devices).mockResolvedValueOnce([devices[1]]);
    pairRevoke.mockResolvedValue(undefined);
    render(<MemoryRouter><ParentDevices /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('iPad')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /revoke ipad/i }));
    await waitFor(() => expect(pairRevoke).toHaveBeenCalledWith('abc12345'));
    await waitFor(() => expect(pairList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('iPad')).not.toBeInTheDocument());
  });
});
