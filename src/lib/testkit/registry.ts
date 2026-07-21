import type { PlayableModule } from './moduleContract';
import { chartsModule } from './modules/charts';
import { arithmeticModule } from './modules/arithmetic';
import { timesTablesModule } from './modules/timesTables';
import { numberSenseModule } from './modules/numberSense';
import { moneyModule } from './modules/money';
import { decimalsModule } from './modules/decimals';
import { numberTheoryModule } from './modules/numberTheory';
import { conversionsModule } from './modules/conversions';
import { wordProblemsModule } from './modules/wordProblems';
import { ratioProportionModule } from './modules/ratioProportion';
import { algebraModule } from './modules/algebra';
import { statisticsModule } from './modules/statistics';
import { timeModule } from './modules/time';
import { fractionsModule } from './modules/fractions';
import { shapesModule } from './modules/shapes';

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
  conversionsModule,
  wordProblemsModule,
  ratioProportionModule,
  algebraModule,
  statisticsModule,
  timeModule,
  fractionsModule,
  shapesModule,
];
