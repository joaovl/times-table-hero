// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FactsProgress } from './FactsProgress';
import { recordFactAttempt, type FactStore } from '@/lib/practice/factModel';

afterEach(() => cleanup());
beforeEach(() => localStorage.clear());

describe('FactsProgress heatmap', () => {
  it('reflects a seeded on-device fact store', () => {
    // Master the 7×8 fact for player p1.
    let store: FactStore = {};
    for (let i = 0; i < 6; i++) store = recordFactAttempt(store, 'mul:7x8', true, 1000, Date.now());
    localStorage.setItem('tth_fact_stats:p1', JSON.stringify(store));

    render(<FactsProgress userId="p1" onBack={() => {}} />);

    // The 7×8 cell (=56) is present and the mastered legend count is at least 1.
    expect(screen.getByTitle(/7 × 8 = 56/)).toBeInTheDocument();
    expect(screen.getByText(/Mastered \(([1-9]\d*)\)/)).toBeInTheDocument();
    // Speed summary appears once a fact has been tried.
    expect(screen.getByText(/Fastest/)).toBeInTheDocument();
  });

  it('prompts to play when nothing is tracked yet', () => {
    render(<FactsProgress userId="p2" onBack={() => {}} />);
    expect(screen.getByText(/your facts will start lighting up/i)).toBeInTheDocument();
  });
});
