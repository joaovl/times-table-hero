// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const kidsCreate = vi.fn();
const kidsDelete = vi.fn();
const kidsUpdate = vi.fn();
vi.mock('@/lib/api/client', () => ({
  kidsList: (...a: unknown[]) => kidsList(...a),
  kidsCreate: (...a: unknown[]) => kidsCreate(...a),
  kidsDelete: (...a: unknown[]) => kidsDelete(...a),
  kidsUpdate: (...a: unknown[]) => kidsUpdate(...a),
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
    fireEvent.change(screen.getByLabelText(/^pin$/i), { target: { value: '246810' } });
    fireEvent.click(screen.getByRole('button', { name: /add kid/i }));
    await waitFor(() => expect(kidsCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alex' })));
    await waitFor(() => expect(screen.getByText('Alex')).toBeInTheDocument());
  });

  it('sends a 6-digit PIN when creating a kid', async () => {
    kidsList.mockResolvedValue([]);
    kidsCreate.mockResolvedValue({ id: 'k3', name: 'Jo', color: 'green', icon: 'rocket' });
    render(<ParentKids />);
    await waitFor(() => expect(kidsList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jo' } });
    fireEvent.change(screen.getByLabelText(/^pin$/i), { target: { value: '246810' } });
    fireEvent.click(screen.getByRole('button', { name: /add kid/i }));
    await waitFor(() => expect(kidsCreate).toHaveBeenCalledWith(expect.objectContaining({ pin: '246810' })));
  });

  it('deletes a kid', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    kidsDelete.mockResolvedValue(undefined);
    render(<ParentKids />);
    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /remove sam/i }));
    await waitFor(() => expect(kidsDelete).toHaveBeenCalledWith('k1'));
  });

  it('resets a kid PIN', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    kidsUpdate.mockResolvedValue({ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' });
    render(<ParentKids />);
    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /reset pin for sam/i }));
    fireEvent.change(screen.getByLabelText(/new pin for sam/i), { target: { value: '112233' } });
    fireEvent.click(screen.getByRole('button', { name: /save new pin/i }));
    await waitFor(() => expect(kidsUpdate).toHaveBeenCalledWith('k1', expect.objectContaining({
      name: 'Sam', color: 'blue', icon: 'star', pin: '112233',
    })));
  });
});
