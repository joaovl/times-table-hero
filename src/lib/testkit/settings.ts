// Single-skill settings factories — one per module. Each builds a settings
// object that mirrors the module's storage-level DEFAULT_SETTINGS, with the
// `skills` / `operation` field overridden to point at the skill under test.
//
// Moved here from play-skill-coverage.test.tsx so both that smoke test and the
// testkit adapters (registry) share one source of truth.

import type { FractionSettings, FractionSkill } from '@/modules/fractions/logic';
import type { ShapeSettings, ShapeSkill } from '@/modules/shapes/logic';
import type { GameSettings as TimesTablesSettings, Operation as TimesTablesOperation } from '@/modules/times-tables/logic';
import type { ArithSettings, ArithOp } from '@/modules/arithmetic/logic';
import type { TimeSettings, TimeSkill } from '@/modules/time/logic';
import type { ChartSettings, ChartSkill } from '@/modules/charts/logic';
import type { NumberSenseSettings, NumberSenseSkill } from '@/modules/number-sense/logic';
import type { MoneySettings, MoneySkill } from '@/modules/money/logic';
import type { DecimalsSettings, DecimalsSkill } from '@/modules/decimals/logic';
import type { NumberTheorySettings, NumberTheorySkill } from '@/modules/number-theory/logic';
import type { ConversionSettings, ConversionSkill } from '@/modules/conversions/logic';
import type { WordSettings, WordProblemSkill } from '@/modules/word-problems/logic';
import type { RatioSettings, RatioSkill } from '@/modules/ratio-proportion/logic';
import type { AlgebraSettings, AlgebraSkill } from '@/modules/algebra/logic';
import type { StatsSettings, StatsSkill } from '@/modules/statistics/logic';

export function fractionSettings(skill: FractionSkill): FractionSettings {
  return {
    skills: [skill],
    denominators: [2, 3, 4],
    simplify: true,
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function shapeSettings(skill: ShapeSkill): ShapeSettings {
  return {
    skills: [skill],
    units: 'cm',
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function timesTablesSettings(operation: TimesTablesOperation): TimesTablesSettings {
  // Tables 1..12 so every operation (incl. divide / sqrt) has a non-empty pool.
  return {
    tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    difficulty: 'medium',
    gameMode: 'questions',
    operation,
    questionCount: 5,
    timeLimit: 60,
  };
}

export function arithmeticSettings(operation: ArithOp): ArithSettings {
  return {
    operation,
    difficulty: 'easy',
    addSubFirstDigits: [2],
    addSubSecondDigits: [2],
    multiplyFirstDigits: [2],
    multiplySecondDigits: [1],
    divideFirstDigits: [2],
    divideSecondDigits: [1],
    allowRemainders: true,
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function timeSettings(skill: TimeSkill): TimeSettings {
  // TimeSettings.skills excludes the 'all' aggregate; the type is the narrow
  // union directly. The skill parameter comes from TIME_SKILL_OPTIONS which
  // already excludes 'all', so this is safe.
  return {
    skills: [skill] as TimeSettings['skills'],
    precisions: ['hour', 'half', 'quarter', '5min'],
    format: '12h',
    numerals: 'arabic',
    arithDifficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function chartsSettings(skill: ChartSkill): ChartSettings {
  return {
    skills: [skill],
    maxValue: 50,
    numCategories: 5,
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function numberSenseSettings(skill: NumberSenseSkill): NumberSenseSettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function moneySettings(skill: MoneySkill): MoneySettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function decimalsSettings(skill: DecimalsSkill): DecimalsSettings {
  return {
    skills: [skill],
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function numberTheorySettings(skill: NumberTheorySkill): NumberTheorySettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function conversionsSettings(skill: ConversionSkill): ConversionSettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function wordProblemsSettings(skill: WordProblemSkill): WordSettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function ratioSettings(skill: RatioSkill): RatioSettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function algebraSettings(skill: AlgebraSkill): AlgebraSettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}

export function statisticsSettings(skill: StatsSkill): StatsSettings {
  return {
    skills: [skill],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 5,
    timeLimit: 60,
  };
}
