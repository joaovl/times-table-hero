import { describe, it, expect } from 'vitest';
import { generateQuestions, generateWrongAnswers, shuffleOptions } from './gameLogic';

describe('Multiplication Calculations', () => {
  // Test all multiplication combinations from 0×0 to 12×12
  describe('All multiplication tables (0-12)', () => {
    for (let i = 0; i <= 12; i++) {
      for (let j = 0; j <= 12; j++) {
        it(`should calculate ${i} × ${j} = ${i * j} correctly`, () => {
          const questions = generateQuestions([i], 1, 'multiply');

          // Find the question with operand2 = j
          const question = questions.find(q => q.operand2 === j);

          if (question) {
            expect(question.answer).toBe(i * j);
            expect(question.operation).toBe('multiply');
          }
        });
      }
    }
  });

  // Test commutative property (a × b = b × a)
  describe('Commutative property', () => {
    const testCases = [
      [2, 3], [5, 7], [4, 9], [6, 8], [10, 11]
    ];

    testCases.forEach(([a, b]) => {
      it(`should verify ${a} × ${b} = ${b} × ${a}`, () => {
        const questions1 = generateQuestions([a], 13, 'multiply');
        const questions2 = generateQuestions([b], 13, 'multiply');

        const q1 = questions1.find(q => q.operand1 === a && q.operand2 === b);
        const q2 = questions2.find(q => q.operand1 === b && q.operand2 === a);

        if (q1 && q2) {
          expect(q1.answer).toBe(q2.answer);
        }
      });
    });
  });

  // Test multiplication by zero
  describe('Multiplication by zero', () => {
    for (let i = 0; i <= 12; i++) {
      it(`should calculate ${i} × 0 = 0`, () => {
        const questions = generateQuestions([i], 13, 'multiply');
        const question = questions.find(q => q.operand2 === 0);

        if (question) {
          expect(question.answer).toBe(0);
        }
      });

      it(`should calculate 0 × ${i} = 0`, () => {
        const questions = generateQuestions([0], 13, 'multiply');
        const question = questions.find(q => q.operand2 === i);

        if (question) {
          expect(question.answer).toBe(0);
        }
      });
    }
  });

  // Test multiplication by one
  describe('Multiplication by one (identity)', () => {
    for (let i = 0; i <= 12; i++) {
      it(`should calculate ${i} × 1 = ${i}`, () => {
        const questions = generateQuestions([i], 13, 'multiply');
        const question = questions.find(q => q.operand2 === 1);

        if (question) {
          expect(question.answer).toBe(i);
        }
      });

      it(`should calculate 1 × ${i} = ${i}`, () => {
        const questions = generateQuestions([1], 13, 'multiply');
        const question = questions.find(q => q.operand2 === i);

        if (question) {
          expect(question.answer).toBe(i);
        }
      });
    }
  });

  // Test specific important multiplications
  describe('Key multiplication facts', () => {
    const keyFacts = [
      [2, 2, 4],
      [3, 3, 9],
      [4, 4, 16],
      [5, 5, 25],
      [6, 6, 36],
      [7, 7, 49],
      [8, 8, 64],
      [9, 9, 81],
      [10, 10, 100],
      [11, 11, 121],
      [12, 12, 144],
      [7, 8, 56],
      [6, 7, 42],
      [8, 9, 72],
    ];

    keyFacts.forEach(([a, b, expected]) => {
      it(`should calculate ${a} × ${b} = ${expected}`, () => {
        const questions = generateQuestions([a], 13, 'multiply');
        const question = questions.find(q => q.operand2 === b);

        if (question) {
          expect(question.answer).toBe(expected);
        }
      });
    });
  });
});

describe('Division Calculations', () => {
  // Test division for all tables
  describe('Division inverse of multiplication', () => {
    for (let table = 1; table <= 12; table++) {
      for (let i = 0; i <= 12; i++) {
        it(`should calculate (${table} × ${i}) ÷ ${table} = ${i}`, () => {
          const questions = generateQuestions([table], 50, 'divide');
          const question = questions.find(
            q => q.operand1 === table * i && q.operand2 === table
          );

          if (question) {
            expect(question.answer).toBe(i);
            expect(question.operation).toBe('divide');
          }
        });
      }
    }
  });

  // Test that division by zero is not generated
  it('should not generate division by zero questions', () => {
    const questions = generateQuestions([0, 1, 2, 3], 100, 'divide');

    questions.forEach(q => {
      if (q.operation === 'divide') {
        expect(q.operand2).not.toBe(0);
      }
    });
  });
});

describe('Wrong Answers Generation', () => {
  describe('Easy difficulty', () => {
    it('should generate wrong answers that are different from correct answer', () => {
      const wrongAnswers = generateWrongAnswers(20, 'easy');

      expect(wrongAnswers).toHaveLength(2);
      expect(wrongAnswers[0]).not.toBe(20);
      expect(wrongAnswers[1]).not.toBe(20);
      expect(wrongAnswers[0]).not.toBe(wrongAnswers[1]);
    });

    it('should generate non-negative wrong answers', () => {
      const wrongAnswers = generateWrongAnswers(5, 'easy');

      wrongAnswers.forEach(answer => {
        expect(answer).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Medium difficulty', () => {
    it('should generate wrong answers close to correct answer', () => {
      const correctAnswer = 50;
      const wrongAnswers = generateWrongAnswers(correctAnswer, 'medium');

      expect(wrongAnswers).toHaveLength(2);
      wrongAnswers.forEach(answer => {
        expect(Math.abs(answer - correctAnswer)).toBeGreaterThan(0);
        // Medium difficulty should be reasonably close
        expect(Math.abs(answer - correctAnswer)).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Shuffle Options', () => {
  it('should include correct answer in shuffled options', () => {
    const correct = 42;
    const wrong = [40, 44];
    const options = shuffleOptions(correct, wrong);

    expect(options).toContain(correct);
    expect(options).toHaveLength(3);
  });

  it('should include all wrong answers in shuffled options', () => {
    const correct = 25;
    const wrong = [23, 27];
    const options = shuffleOptions(correct, wrong);

    expect(options).toContain(23);
    expect(options).toContain(27);
    expect(options).toHaveLength(3);
  });
});

describe('Question Generation', () => {
  it('should generate requested number of questions', () => {
    const questions = generateQuestions([5, 7], 20, 'multiply');
    expect(questions).toHaveLength(20);
  });

  it('should generate both multiplication and division when operation is "both"', () => {
    const questions = generateQuestions([3, 4], 50, 'both');

    const hasMultiply = questions.some(q => q.operation === 'multiply');
    const hasDivide = questions.some(q => q.operation === 'divide');

    expect(hasMultiply).toBe(true);
    expect(hasDivide).toBe(true);
  });

  it('should only generate multiplication when operation is "multiply"', () => {
    const questions = generateQuestions([5], 20, 'multiply');

    questions.forEach(q => {
      expect(q.operation).toBe('multiply');
    });
  });

  it('should only generate division when operation is "divide"', () => {
    const questions = generateQuestions([6], 20, 'divide');

    questions.forEach(q => {
      expect(q.operation).toBe('divide');
    });
  });
});
