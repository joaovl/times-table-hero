// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ShapesPlay } from './ShapesPlay';
import type { ShapeSettings, ShapeSkill } from './logic';

afterEach(cleanup);

function settingsForSkill(skill: ShapeSkill): ShapeSettings {
  return {
    skills: [skill],
    units: 'cm',
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

describe('<ShapesPlay> Y6 skill rendering', () => {
  it('renders a text input and a figure for coord-four-quadrants', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    const { container } = render(
      <ShapesPlay
        settings={settingsForSkill('coord-four-quadrants')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    // Free-form text input with the typed-answer aria label.
    expect(screen.getByLabelText('Type the answer')).toBeInTheDocument();
    // The prompt should mention coordinates.
    expect(screen.getByText(/Coordinates/i)).toBeInTheDocument();
    // The figure renders an SVG.
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a numeric input and a figure for angle-at-point', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    const { container } = render(
      <ShapesPlay
        settings={settingsForSkill('angle-at-point')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    expect(screen.getByLabelText('Type the answer')).toBeInTheDocument();
    // The prompt should reference the 360° rule.
    expect(screen.getByText(/360/)).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a numeric input and a figure for angle-on-line', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    const { container } = render(
      <ShapesPlay
        settings={settingsForSkill('angle-on-line')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    expect(screen.getByLabelText('Type the answer')).toBeInTheDocument();
    // Prompt references the 180° rule.
    expect(screen.getByText(/180/)).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a numeric input and a figure for angle-vertical', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    const { container } = render(
      <ShapesPlay
        settings={settingsForSkill('angle-vertical')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    expect(screen.getByLabelText('Type the answer')).toBeInTheDocument();
    // Prompt uses the word "opposite".
    expect(screen.getByText(/opposite/i)).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
