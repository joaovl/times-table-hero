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
// This file covers EVERY shipping module. For modules whose Settings shape
// has a `skills: [skill]` array (the common case) we parameterise over the
// module's `ALL_SKILLS`-style export. For the two outliers — times-tables
// and arithmetic — we parameterise over the `operation` field instead.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { FractionsPlay } from '@/modules/fractions/FractionsPlay';
import { ALL_SKILLS as FRACTION_SKILLS } from '@/modules/fractions/logic';
import type { FractionSettings, FractionSkill } from '@/modules/fractions/logic';

import { ShapesPlay } from '@/modules/shapes/ShapesPlay';
import { SHAPE_SKILL_OPTIONS } from '@/modules/shapes/logic';
import type { ShapeSettings, ShapeSkill } from '@/modules/shapes/logic';

import { TimesTablesPlay } from '@/modules/times-tables/TimesTablesPlay';
import type { GameSettings as TimesTablesSettings, Operation as TimesTablesOperation } from '@/modules/times-tables/logic';

import { ArithmeticPlay } from '@/modules/arithmetic/ArithmeticPlay';
import type { ArithSettings, ArithOp } from '@/modules/arithmetic/logic';

import { TimePlay } from '@/modules/time/TimePlay';
import { TIME_SKILL_OPTIONS } from '@/modules/time/logic';
import type { TimeSettings, TimeSkill } from '@/modules/time/logic';

import { ChartsPlay } from '@/modules/charts/ChartsPlay';
import { CHART_SKILL_OPTIONS } from '@/modules/charts/logic';
import type { ChartSettings, ChartSkill } from '@/modules/charts/logic';

import { NumberSensePlay } from '@/modules/number-sense/NumberSensePlay';
import { ALL_SKILLS as NUMBER_SENSE_SKILLS } from '@/modules/number-sense/logic';
import type { NumberSenseSettings, NumberSenseSkill } from '@/modules/number-sense/logic';

import { MoneyPlay } from '@/modules/money/MoneyPlay';
import { MONEY_SKILL_OPTIONS } from '@/modules/money/logic';
import type { MoneySettings, MoneySkill } from '@/modules/money/logic';

import { DecimalsPlay } from '@/modules/decimals/DecimalsPlay';
import { ALL_SKILLS as DECIMAL_SKILLS } from '@/modules/decimals/logic';
import type { DecimalsSettings, DecimalsSkill } from '@/modules/decimals/logic';

import { NumberTheoryPlay } from '@/modules/number-theory/NumberTheoryPlay';
import { NUMBER_THEORY_SKILL_OPTIONS } from '@/modules/number-theory/logic';
import type { NumberTheorySettings, NumberTheorySkill } from '@/modules/number-theory/logic';

import { ConversionsPlay } from '@/modules/conversions/ConversionsPlay';
import { CONVERSION_SKILL_OPTIONS } from '@/modules/conversions/logic';
import type { ConversionSettings, ConversionSkill } from '@/modules/conversions/logic';

import { WordProblemsPlay } from '@/modules/word-problems/WordProblemsPlay';
import { WORD_SKILL_OPTIONS } from '@/modules/word-problems/logic';
import type { WordSettings, WordProblemSkill } from '@/modules/word-problems/logic';

import { RatioProportionPlay } from '@/modules/ratio-proportion/RatioProportionPlay';
import { ALL_SKILLS as RATIO_SKILLS } from '@/modules/ratio-proportion/logic';
import type { RatioSettings, RatioSkill } from '@/modules/ratio-proportion/logic';

import { AlgebraPlay } from '@/modules/algebra/AlgebraPlay';
import { ALL_SKILLS as ALGEBRA_SKILLS } from '@/modules/algebra/logic';
import type { AlgebraSettings, AlgebraSkill } from '@/modules/algebra/logic';

import { StatisticsPlay } from '@/modules/statistics/StatisticsPlay';
import { ALL_SKILLS as STATS_SKILLS } from '@/modules/statistics/logic';
import type { StatsSettings, StatsSkill } from '@/modules/statistics/logic';

// Single-skill settings factories now live in the testkit so the adapters and
// this smoke test share one source of truth.
import {
  fractionSettings, shapeSettings, timesTablesSettings, arithmeticSettings,
  timeSettings, chartsSettings, numberSenseSettings, moneySettings,
  decimalsSettings, numberTheorySettings, conversionsSettings,
  wordProblemsSettings, ratioSettings, algebraSettings, statisticsSettings,
} from '@/lib/testkit/settings';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Shared assertions.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Test suites — one describe block per module.
// ---------------------------------------------------------------------------

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

describe('Play UI smoke test (times-tables)', () => {
  // Times-tables uses `operation` (multiply / divide / square / sqrt / all)
  // rather than a `skills` array. We iterate over every concrete operation
  // plus the `all` aggregate so the smoke test mirrors what real users pick.
  const operations: TimesTablesOperation[] = ['multiply', 'divide', 'square', 'sqrt', 'all'];
  for (const op of operations) {
    it(`renders TimesTablesPlay for operation "${op}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <TimesTablesPlay
          settings={timesTablesSettings(op)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, op);
      assertAnswerInput(container, op);
    });
  }
});

describe('Play UI smoke test (arithmetic)', () => {
  // Arithmetic also uses `operation` rather than `skills`. The 'all' value
  // is an aggregate. We iterate the four concrete ops + 'all' so each branch
  // of the question renderer is exercised.
  const operations: ArithOp[] = ['add', 'subtract', 'multiply', 'divide', 'all'];
  for (const op of operations) {
    it(`renders ArithmeticPlay for operation "${op}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <ArithmeticPlay
          settings={arithmeticSettings(op)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, op);
      assertAnswerInput(container, op);
    });
  }
});

describe('Play UI smoke test (time)', () => {
  for (const skill of TIME_SKILL_OPTIONS) {
    it(`renders TimePlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <TimePlay
          settings={timeSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (charts)', () => {
  for (const skill of CHART_SKILL_OPTIONS) {
    it(`renders ChartsPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <ChartsPlay
          settings={chartsSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (number-sense)', () => {
  for (const skill of NUMBER_SENSE_SKILLS) {
    it(`renders NumberSensePlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <NumberSensePlay
          settings={numberSenseSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (money)', () => {
  for (const skill of MONEY_SKILL_OPTIONS) {
    it(`renders MoneyPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <MoneyPlay
          settings={moneySettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (decimals)', () => {
  for (const skill of DECIMAL_SKILLS) {
    it(`renders DecimalsPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <DecimalsPlay
          settings={decimalsSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (number-theory)', () => {
  for (const skill of NUMBER_THEORY_SKILL_OPTIONS) {
    it(`renders NumberTheoryPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <NumberTheoryPlay
          settings={numberTheorySettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (conversions)', () => {
  for (const skill of CONVERSION_SKILL_OPTIONS) {
    it(`renders ConversionsPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <ConversionsPlay
          settings={conversionsSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (word-problems)', () => {
  for (const skill of WORD_SKILL_OPTIONS) {
    it(`renders WordProblemsPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <WordProblemsPlay
          settings={wordProblemsSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (ratio-proportion)', () => {
  for (const skill of RATIO_SKILLS) {
    it(`renders RatioProportionPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <RatioProportionPlay
          settings={ratioSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (algebra)', () => {
  for (const skill of ALGEBRA_SKILLS) {
    it(`renders AlgebraPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <AlgebraPlay
          settings={algebraSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});

describe('Play UI smoke test (statistics)', () => {
  for (const skill of STATS_SKILLS) {
    it(`renders StatisticsPlay for skill "${skill}" without crashing`, () => {
      const onComplete = vi.fn();
      const onQuit = vi.fn();
      const { container } = render(
        <StatisticsPlay
          settings={statisticsSettings(skill)}
          onComplete={onComplete}
          onQuit={onQuit}
        />
      );
      assertNonEmptyCard(container, skill);
      assertAnswerInput(container, skill);
    });
  }
});
