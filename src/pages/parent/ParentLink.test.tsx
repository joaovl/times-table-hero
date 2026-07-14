// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const setLink = vi.fn();
const clearLink = vi.fn();
const getAllLinks = vi.fn(() => ({}));
vi.mock('@/lib/api/client', () => ({ kidsList: (...a: unknown[]) => kidsList(...a) }));
vi.mock('@/lib/userStorage', () => ({
  getUsers: () => [{ id: 'p1', name: 'Sammy', color: 'blue', icon: 'star', createdAt: '' }],
}));
vi.mock('@/lib/practice/kidLink', () => ({
  getAllLinks: () => getAllLinks(),
  setLink: (...a: unknown[]) => setLink(...a),
  clearLink: (...a: unknown[]) => clearLink(...a),
}));

import ParentLink from './ParentLink';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('ParentLink', () => {
  it('links a local player to a cloud kid', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    render(<ParentLink />);
    const select = await screen.findByLabelText(/link sammy to a kid/i);
    fireEvent.change(select, { target: { value: 'k1' } });
    expect(setLink).toHaveBeenCalledWith('p1', 'k1');
  });

  it('prompts to add a kid first when there are none', async () => {
    kidsList.mockResolvedValue([]);
    render(<ParentLink />);
    await waitFor(() => expect(screen.getByText(/add a kid first/i)).toBeInTheDocument());
  });
});
