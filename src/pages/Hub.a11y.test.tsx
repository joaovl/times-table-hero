// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

import Hub from './Hub';

// jsdom does not implement matchMedia, which is used indirectly by some
// of Hub's dependencies (the PWA install hook). Provide a permissive stub
// so the component renders without throwing.
function ensureMatchMedia() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia) return;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function renderHub() {
  return render(
    <MemoryRouter>
      <Hub />
    </MemoryRouter>
  );
}

describe('Hub accessibility', () => {
  beforeEach(() => {
    ensureMatchMedia();
    try {
      localStorage.clear();
    } catch {
      // jsdom always provides localStorage, but stay defensive.
    }
  });

  afterEach(cleanup);

  it('renders the year picker as an ARIA radiogroup', () => {
    renderHub();
    const group = screen.getByRole('radiogroup', { name: /school year/i });
    expect(group).toBeInTheDocument();
  });

  it('renders four radios (All / Y3 / Y4 / Y5), each with aria-checked', () => {
    renderHub();
    const group = screen.getByRole('radiogroup', { name: /school year/i });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(4);
    for (const r of radios) {
      // aria-checked is required on every radio.
      expect(r).toHaveAttribute('aria-checked');
    }
    // Exactly one is checked at any time.
    const checked = radios.filter(r => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
  });

  it('only the checked radio is in the tab order (single-tab radiogroup pattern)', () => {
    renderHub();
    const group = screen.getByRole('radiogroup', { name: /school year/i });
    const radios = within(group).getAllByRole('radio') as HTMLButtonElement[];
    for (const r of radios) {
      const checked = r.getAttribute('aria-checked') === 'true';
      // tabIndex 0 for the checked radio, -1 for the rest.
      expect(r.tabIndex).toBe(checked ? 0 : -1);
    }
  });

  it('arrow keys move focus through the radio group and update the selection', () => {
    renderHub();
    const group = screen.getByRole('radiogroup', { name: /school year/i });
    const radios = within(group).getAllByRole('radio') as HTMLButtonElement[];
    // "All" is the default. Focus it, then press ArrowRight.
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    // After arrow-right, the second radio (Y3) should be checked and focused.
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(radios[1]);
    // ArrowLeft wraps back round to "All".
    fireEvent.keyDown(radios[1], { key: 'ArrowLeft' });
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(radios[0]);
  });
});
