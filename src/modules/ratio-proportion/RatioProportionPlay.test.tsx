// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RatioProportionPlay } from './RatioProportionPlay';
import type { RatioSettings } from './logic';

// Logging is a no-op in tests, but stub it so nothing tries to reach the API.
vi.mock('@/lib/practice/recordPractice', () => ({ recordPractice: () => {} }));

afterEach(() => cleanup());

const base: Omit<RatioSettings, 'difficulty'> = {
  skills: ['percent-of'],
  gameMode: 'questions',
  questionCount: 5,
  timeLimit: 60,
};

function renderPlay(difficulty: RatioSettings['difficulty']) {
  render(
    <RatioProportionPlay
      settings={{ ...base, difficulty }}
      onComplete={() => {}}
      onQuit={() => {}}
    />,
  );
}

describe('RatioProportionPlay input mode by difficulty', () => {
  it('easy shows answer choice buttons and no typed box', async () => {
    renderPlay('easy');
    const buttons = await screen.findAllByRole('button', { name: /^Answer / });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByLabelText('Type the answer')).not.toBeInTheDocument();
  });

  it('medium shows answer choice buttons', async () => {
    renderPlay('medium');
    const buttons = await screen.findAllByRole('button', { name: /^Answer / });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('hard shows a typed box and no choice buttons', () => {
    renderPlay('hard');
    expect(screen.getByLabelText('Type the answer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Answer / })).not.toBeInTheDocument();
  });
});
