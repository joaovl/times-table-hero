// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

const bugReport = vi.fn();
vi.mock('@/lib/api/client', () => ({ bugReport: (...a: unknown[]) => bugReport(...a) }));
vi.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => ({ account: { email: 'p@x.com' } }) }));

import FeedbackTrigger from './FeedbackTrigger';
import { recordAttempt, clearRecentAttempts } from '@/lib/feedback/attemptLog';

beforeEach(() => { vi.clearAllMocks(); clearRecentAttempts(); });
afterEach(() => cleanup());

const renderIt = () => render(<MemoryRouter><FeedbackTrigger /></MemoryRouter>);

describe('FeedbackTrigger', () => {
  it('stays hidden for a couple of taps, opens the dialog after 5 quick taps', () => {
    renderIt();
    const trigger = screen.getByRole('button', { name: /report a problem/i });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('submits a report with the reporter email and recent-attempt context', async () => {
    recordAttempt({ module: 'shapes', skill: 'coord-four-quadrants', question: 'Read the point', typed: '-2,-3', correct: false, expected: '(-2, -3)' });
    bugReport.mockResolvedValue(42);
    renderIt();
    const trigger = screen.getByRole('button', { name: /report a problem/i });
    for (let i = 0; i < 5; i++) fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText(/what went wrong/i), { target: { value: 'Coordinates rejected -2,-3' } });
    fireEvent.click(screen.getByRole('button', { name: /send report/i }));
    await waitFor(() => expect(bugReport).toHaveBeenCalled());
    const arg = bugReport.mock.calls[0][0];
    expect(arg.reporter).toBe('p@x.com');
    expect(arg.body).toContain('Coordinates rejected');
    expect(arg.context.recent[0].typed).toBe('-2,-3');
    await waitFor(() => expect(screen.getByText(/your report was sent/i)).toBeInTheDocument());
  });

  it('opens when the parent-area event fires', () => {
    renderIt();
    fireEvent(window, new CustomEvent('tth-open-feedback'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
