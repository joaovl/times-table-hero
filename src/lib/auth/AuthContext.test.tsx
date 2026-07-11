// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@/lib/api/client', () => ({
  tokenStore: { get: vi.fn(() => null), set: vi.fn(), clear: vi.fn() },
  authMe: vi.fn(),
  authLogin: vi.fn(),
  authSignup: vi.fn(),
  authLogout: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';
import { tokenStore, authMe, authLogin } from '@/lib/api/client';

function Probe() {
  const { status, account, login } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{account?.email ?? ''}</span>
      <button onClick={() => login('p@x.com', 'longenough')}>login</button>
    </div>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('AuthProvider', () => {
  it('starts anon when there is no stored token', async () => {
    (tokenStore.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'));
  });

  it('validates a stored token via authMe on mount', async () => {
    (tokenStore.get as ReturnType<typeof vi.fn>).mockReturnValue('tok');
    (authMe as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'a1', email: 'stored@x.com' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authed'));
    expect(screen.getByTestId('email')).toHaveTextContent('stored@x.com');
  });

  it('login updates the account and status', async () => {
    (tokenStore.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (authLogin as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'a1', email: 'p@x.com' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'));
    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authed'));
    expect(screen.getByTestId('email')).toHaveTextContent('p@x.com');
  });
});
