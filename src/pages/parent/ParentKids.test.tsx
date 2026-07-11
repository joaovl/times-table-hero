// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const kidsCreate = vi.fn();
const kidsDelete = vi.fn();
vi.mock('@/lib/api/client', () => ({
  kidsList: (...a: unknown[]) => kidsList(...a),
  kidsCreate: (...a: unknown[]) => kidsCreate(...a),
  kidsDelete: (...a: unknown[]) => kidsDelete(...a),
  ApiError: class extends Error { code = 'x'; },
}));

import ParentKids from './ParentKids';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('ParentKids', () => {
  it('lists existing kids', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    render(<ParentKids />);
    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
  });

  it('adds a kid', async () => {
    kidsList.mockResolvedValue([]);
    kidsCreate.mockResolvedValue({ id: 'k2', name: 'Alex', color: 'green', icon: 'rocket' });
    render(<ParentKids />);
    await waitFor(() => expect(kidsList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByRole('button', { name: /add kid/i }));
    await waitFor(() => expect(kidsCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alex' })));
    await waitFor(() => expect(screen.getByText('Alex')).toBeInTheDocument());
  });

  it('deletes a kid', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    kidsDelete.mockResolvedValue(undefined);
    render(<ParentKids />);
    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /remove sam/i }));
    await waitFor(() => expect(kidsDelete).toHaveBeenCalledWith('k1'));
  });
});
