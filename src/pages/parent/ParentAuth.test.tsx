// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const login = vi.fn();
const signup = vi.fn();
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'anon', account: null, login, signup, logout: vi.fn() }),
}));

import ParentAuth from './ParentAuth';
import { ApiError } from '@/lib/api/client';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ParentAuth', () => {
  it('logs in with entered credentials', async () => {
    login.mockResolvedValue(undefined);
    render(<ParentAuth />);
    type(/email/i, 'p@x.com');
    type(/password/i, 'longenough');
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('p@x.com', 'longenough'));
  });

  it('shows a friendly message on invalid credentials', async () => {
    login.mockRejectedValue(new ApiError('invalid_credentials', 401));
    render(<ParentAuth />);
    type(/email/i, 'p@x.com');
    type(/password/i, 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument());
  });

  it('can switch to sign up and calls signup', async () => {
    signup.mockResolvedValue(undefined);
    render(<ParentAuth />);
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    type(/email/i, 'new@x.com');
    type(/password/i, 'longenough');
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith('new@x.com', 'longenough'));
  });
});
