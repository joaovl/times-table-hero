// e2e/support/oracle.ts
//
// Reads the hidden, test-only oracle node rendered by
// `src/lib/e2e/oracle.tsx` (only present when the app is built with
// `--mode e2e`, see `npm run e2e:server`). It exposes the "ground truth" for
// the current question so specs can assert correctness/variety/no-clues
// without having to re-derive answers from the DOM.
import { expect, type Page } from '@playwright/test';

export interface OracleData {
  questionId: string; // stable per-question identity (variety/wait)
  expected: string; // canonical answer a knowing user would give
  inputMode: 'choices' | 'typed';
  choices?: string[]; // button labels when inputMode === 'choices'
  correctChoice?: string; // which label is correct (may be 'None of these')
  highlightCount?: number; // # of highlighted chart elements (clue detector)
}

export async function readOracle(page: Page): Promise<OracleData> {
  const node = page.getByTestId('e2e-oracle');
  await expect(node).toBeAttached();
  const raw = await node.getAttribute('data-oracle');
  if (!raw) throw new Error('e2e-oracle node has no data-oracle payload');
  return JSON.parse(raw) as OracleData;
}
