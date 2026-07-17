// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const pairDevice = vi.fn();
vi.mock('@/lib/api/client', () => ({
  pairDevice: (...a: unknown[]) => pairDevice(...a),
  ApiError: class extends Error { code = 'x'; },
}));

import SetupDevice from './SetupDevice';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('SetupDevice', () => {
  it('submits the email and 6-digit PIN to pairDevice', async () => {
    pairDevice.mockResolvedValue({ token: 'ptok1' });
    render(<MemoryRouter><SetupDevice /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'p@x.com' } });
    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '135790' } });
    fireEvent.click(screen.getByRole('button', { name: /pair this device/i }));
    await waitFor(() => expect(pairDevice).toHaveBeenCalledWith('p@x.com', '135790'));
  });

  it('shows a confirmation once paired', async () => {
    pairDevice.mockResolvedValue({ token: 'ptok1' });
    render(<MemoryRouter><SetupDevice /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'p@x.com' } });
    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '135790' } });
    fireEvent.click(screen.getByRole('button', { name: /pair this device/i }));
    await waitFor(() => expect(screen.getByText(/this device is paired/i)).toBeInTheDocument());
  });

  it('rejects a PIN that is not 6 digits', async () => {
    render(<MemoryRouter><SetupDevice /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'p@x.com' } });
    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /pair this device/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(pairDevice).not.toHaveBeenCalled();
  });

  it('shows an error message when pairing fails', async () => {
    pairDevice.mockRejectedValue(new Error('nope'));
    render(<MemoryRouter><SetupDevice /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'p@x.com' } });
    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '135790' } });
    fireEvent.click(screen.getByRole('button', { name: /pair this device/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
