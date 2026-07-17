import { E2E_ENABLED } from './env';

export interface OracleData {
  questionId: string;                 // stable per-question identity (variety/wait)
  expected: string;                   // canonical answer a knowing user would give
  inputMode: 'choices' | 'typed';
  choices?: string[];                 // button labels when inputMode === 'choices'
  correctChoice?: string;             // which label is correct (may be 'None of these')
  highlightCount?: number;            // # of highlighted chart elements (clue detector)
}

// Hidden, test-only. Present only when the VITE_E2E build flag is on, so it
// never reaches real users. `enabled` is injectable for unit tests.
export function E2EOracle({ data, enabled = E2E_ENABLED }: { data: OracleData; enabled?: boolean }) {
  if (!enabled) return null;
  return <div data-testid="e2e-oracle" data-oracle={JSON.stringify(data)} hidden />;
}
