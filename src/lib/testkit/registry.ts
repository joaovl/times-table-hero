import type { PlayableModule } from './moduleContract';
import { chartsModule } from './modules/charts';

// Adapters are appended here as they land (Tasks 3-8 of the regression plan).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_MODULES: PlayableModule<any, any>[] = [
  chartsModule,
];
