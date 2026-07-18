// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const pairKids = vi.fn();
const kidSignin = vi.fn();
const pairingGet = vi.fn<[], string | null>(() => 'pair-tok');
vi.mock('@/lib/api/client', () => ({
  pairKids: (...a: unknown[]) => pairKids(...a),
  kidSignin: (...a: unknown[]) => kidSignin(...a),
  pairingTokenStore: { get: () => pairingGet() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

import WhosPlaying from './WhosPlaying';

const kids = [
  { id: 'k1', name: 'Sam', color: '#3366ff', icon: 'star' },
  { id: 'k2', name: 'Ada', color: '#ff3366', icon: 'heart' },
];

beforeEach(() => { vi.clearAllMocks(); pairingGet.mockReturnValue('pair-tok'); });
afterEach(() => cleanup());

const renderPage = () => render(<MemoryRouter><WhosPlaying /></MemoryRouter>);

describe('WhosPlaying', () => {
  it('prompts to set up the device when it is not paired', () => {
    pairingGet.mockReturnValue(null);
    renderPage();
    expect(screen.getByRole('link', { name: /set up this device/i })).toBeInTheDocument();
    expect(pairKids).not.toHaveBeenCalled();
  });

  it('lists the kids, then signs the chosen kid in with their PIN and navigates to play', async () => {
    pairKids.mockResolvedValue(kids);
    kidSignin.mockResolvedValue(undefined);
    renderPage();

    // Pick Sam.
    fireEvent.click(await screen.findByRole('button', { name: /play as Sam/i }));
    // Enter a 6-digit PIN and play.
    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '135790' } });
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    await waitFor(() => expect(kidSignin).toHaveBeenCalledWith(kids[0], '135790'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('shows an error and does not navigate on a wrong PIN', async () => {
    pairKids.mockResolvedValue(kids);
    kidSignin.mockRejectedValue(new Error('unauthorized'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /play as Ada/i }));
    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/didn.t match/i));
    expect(navigate).not.toHaveBeenCalled();
  });
});
