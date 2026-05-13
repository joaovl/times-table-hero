// @vitest-environment jsdom
//
// Play UI smoke test. For each skill exposed by a module's `logic.ts`, mount
// the module's Play component with a single-skill settings object and assert:
//
//   1. The component renders without throwing.
//   2. A non-empty Card is present (so the question prompt area isn't blank).
//   3. An interactive answer input is present (form/input/button) — this is
//      what catches the original Y6 gap, where the new skills had questions
//      but no UI to type the answer.
//
// We DO NOT navigate through the React Router or invoke setup screens —
// that would require a much larger fixture and tightly couple the test to
// every module's stepper UX. Instead we drive Play directly with a hand-
// rolled settings object, which mirrors how Index.tsx hands off after
// setup submission.
//
// The test only exercises the fractions and shapes modules in this PR. They
// are the modules where the recent Y6 work landed un-wired UI bugs. The
// pattern is intentionally extensible: a follow-up PR can add the remaining
// modules by extending the `MODULES` array below.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { FractionsPlay } from '@/modules/fractions/FractionsPlay';
import { ALL_SKILLS as FRACTION_SKILLS } from '@/modules/fractions/logic';
import type { FractionSettings, FractionSkill } from '@/modules/fractions/logic';

import { ShapesPlay } from '@/modules/shapes/ShapesPlay';
import {
  SHAPE_SKILL_OPTIONS,
} from '@/modules/shapes/logic';
import type { ShapeSettings, ShapeSkill } from '@/modules/shapes/logic';

afterEach(cleanup);

function fractionSettings(skill: FractionSkill): FractionSettings {
  return {
    skills: [skill],
    denominators: [2, 3, 4],
    simplify: true,
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

function shapeSettings(skill: ShapeSkill): ShapeSettings {
  return {
    skills: [skill],
    units: 'cm',
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

/**
 * A non-empty Card from the question area means the question prompt
 * region has content. A play screen that silently rendered an empty
 * card (the Y6 gap symptom) would fail this check.
 */
function assertNonEmptyCard(container: HTMLElement, skill: string): void {
  const cards = container.querySelectorAll('.shadow-card');
  expect(
    cards.length,
    `expected at least one Card for skill "${skill}"`
  ).toBeGreaterThan(0);
  const firstCard = cards[0];
  // Text content OR an SVG (visual question) counts as non-empty.
  const hasText = (firstCard.textContent ?? '').trim().length > 0;
  const hasSvg = firstCard.querySelector('svg') !== null;
  expect(
    hasText || hasSvg,
    `expected Card to have visible question content for skill "${skill}"`
  ).toBe(true);
}

/**
 * An interactive answer region (form / input / button) must be present so
 * the kid can actually answer. A play screen with no input was the original
 * Y6 gap; this check would have caught it.
 */
function assertAnswerInput(container: HTMLElement, skill: string): void {
  const hasForm = container.querySelector('form') !== null;
  const hasInput = container.querySelector('input') !== null;
  const buttons = container.querySelectorAll('button');
  // Filter out the always-present "Quit" button — there must be at least one
  // other interactive element below the card.
  const nonQuitButtons = Array.from(buttons).filter(
    b => (b.textContent ?? '').trim() !== '← Quit'
  );
  expect(
    hasForm || hasInput || nonQuitButtons.length > 0,
    `expected an answer input (form/input/button) for skill "${skill}"`
  ).toBe(true);
}

describe('Play UI smoke test (fractions)', () => {
  for (const skill of FRACTION_SKILLS) {
    it(`renders FractionsPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <FractionsPlay
          settings={fractionSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (shapes)', () => {
  for (const skill of SHAPE_SKILL_OPTIONS) {
    it(`renders ShapesPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <ShapesPlay
          settings={shapeSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});
