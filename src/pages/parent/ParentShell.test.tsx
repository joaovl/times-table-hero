// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

let mockAuth: { status: string; account: { email: string } | null; logout: () => void };
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import RequireAuth from './RequireAuth';
import ParentHome from './ParentHome';

afterEach(() => { cleanup(); });

describe('RequireAuth', () => {
  it('shows the login screen when anon', () => {
    mockAuth = { status: 'anon', account: null, logout: vi.fn() };
    render(<RequireAuth><div>secret</div></RequireAuth>);
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders children when authed', () => {
    mockAuth = { status: 'authed', account: { email: 'p@x.com' }, logout: vi.fn() };
    render(<RequireAuth><div>secret</div></RequireAuth>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});

describe('ParentHome', () => {
  it('greets the signed-in parent', () => {
    mockAuth = { status: 'authed', account: { email: 'p@x.com' }, logout: vi.fn() };
    render(<MemoryRouter><ParentHome /></MemoryRouter>);
    expect(screen.getByText(/p@x.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });
});
