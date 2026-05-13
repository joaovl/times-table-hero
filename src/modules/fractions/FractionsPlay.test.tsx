// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { FractionsPlay } from './FractionsPlay';
import type { FractionSettings, FractionSkill } from './logic';

afterEach(cleanup);

// FractionsPlay drives its own question generation from a settings object
// via generateFractionQuestions(). To exercise a specific Y6 skill we set
// settings.skills to a single-element array so the generator is forced to
// emit that skill type. The denominators are restricted to keep the answer
// space tight and the generated question deterministic enough to assert
// the rendered input shape (we don't assert on the actual numerator /
// denominator values — only that the inputs exist).

function settingsForSkill(skill: FractionSkill): FractionSettings {
  return {
    skills: [skill],
    denominators: [2, 3, 4],
    simplify: true,
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

describe('<FractionsPlay> Y6 skill rendering', () => {
  it('renders the 3-field whole/num/den answer form for add-mixed', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    render(
      <FractionsPlay
        settings={settingsForSkill('add-mixed')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    // The mixed-add/sub form uses whole + n/d inputs (three Inputs).
    expect(screen.getByLabelText('Whole part')).toBeInTheDocument();
    expect(screen.getByLabelText('Numerator')).toBeInTheDocument();
    expect(screen.getByLabelText('Denominator')).toBeInTheDocument();
    // The "+" operator glyph is shown in the question card.
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('renders the 3-field whole/num/den answer form for sub-mixed', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    render(
      <FractionsPlay
        settings={settingsForSkill('sub-mixed')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    expect(screen.getByLabelText('Whole part')).toBeInTheDocument();
    expect(screen.getByLabelText('Numerator')).toBeInTheDocument();
    expect(screen.getByLabelText('Denominator')).toBeInTheDocument();
    // The math-minus glyph '−' is shown for sub-mixed.
    expect(screen.getByText('−')).toBeInTheDocument();
  });

  it('renders the 2-field n/d answer form for div-frac-whole', () => {
    const onComplete = vi.fn();
    const onQuit = vi.fn();
    render(
      <FractionsPlay
        settings={settingsForSkill('div-frac-whole')}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    );
    // Two fields, no whole-part input.
    expect(screen.getByLabelText('Numerator')).toBeInTheDocument();
    expect(screen.getByLabelText('Denominator')).toBeInTheDocument();
    expect(screen.queryByLabelText('Whole part')).toBeNull();
    // The "÷" operator glyph is shown in the question card.
    expect(screen.getByText('÷')).toBeInTheDocument();
  });
});
