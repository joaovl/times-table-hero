import type { PlayableModule } from './moduleContract';
import { chartsModule } from './modules/charts';
import { arithmeticModule } from './modules/arithmetic';
import { timesTablesModule } from './modules/timesTables';
import { numberSenseModule } from './modules/numberSense';
import { moneyModule } from './modules/money';
import { decimalsModule } from './modules/decimals';
import { numberTheoryModule } from './modules/numberTheory';

// Adapters are appended here as they land (Tasks 3-8 of the regression plan).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_MODULES: PlayableModule<any, any>[] = [
  chartsModule,
  arithmeticModule,
  timesTablesModule,
  numberSenseModule,
  moneyModule,
  decimalsModule,
  numberTheoryModule,
];
