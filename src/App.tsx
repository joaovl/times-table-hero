import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import NotFound from './pages/NotFound';
import { getTheme, applyTheme } from '@/lib/themeStorage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import RequireAuth from './pages/parent/RequireAuth';
import ParentHome from './pages/parent/ParentHome';
import ParentKids from './pages/parent/ParentKids';
import BribeArea from './pages/parent/BribeArea';
import Dashboard from './pages/parent/Dashboard';

// Lazy-load every module so the initial bundle only contains the Hub +
// router + theme system. Each module ships as its own chunk and is fetched
// only when the kid navigates to it. This keeps the main bundle small and
// makes the Hub load fast even on a school network.
const TimesTablesIndex = lazy(() => import('./modules/times-tables/TimesTablesIndex'));
const ArithmeticIndex = lazy(() => import('./modules/arithmetic/ArithmeticIndex'));
const TimeIndex = lazy(() => import('./modules/time/TimeIndex'));
const FractionsIndex = lazy(() => import('./modules/fractions/FractionsIndex'));
const ShapesIndex = lazy(() => import('./modules/shapes/ShapesIndex'));
const ChartsIndex = lazy(() => import('./modules/charts/ChartsIndex'));
const NumberSenseIndex = lazy(() => import('./modules/number-sense/NumberSenseIndex'));
const MoneyIndex = lazy(() => import('./modules/money/MoneyIndex'));
const DecimalsIndex = lazy(() => import('./modules/decimals/DecimalsIndex'));
const NumberTheoryIndex = lazy(() => import('./modules/number-theory/NumberTheoryIndex'));
const ConversionsIndex = lazy(() => import('./modules/conversions/ConversionsIndex'));
const WordProblemsIndex = lazy(() => import('./modules/word-problems/WordProblemsIndex'));
const RatioProportionIndex = lazy(() => import('./modules/ratio-proportion/RatioProportionIndex'));
const AlgebraIndex = lazy(() => import('./modules/algebra/AlgebraIndex'));
const StatisticsIndex = lazy(() => import('./modules/statistics/StatisticsIndex'));

const ModuleLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-xl font-bold text-primary" role="status" aria-live="polite">
      Loading...
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  return (
    <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<ModuleLoading />}>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/parent" element={<RequireAuth><ParentHome /></RequireAuth>} />
          <Route path="/parent/kids" element={<RequireAuth><ParentKids /></RequireAuth>} />
          <Route path="/parent/rewards" element={<RequireAuth><BribeArea /></RequireAuth>} />
          <Route path="/parent/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/times-tables" element={<TimesTablesIndex />} />
          <Route path="/times-tables/print" element={<TimesTablesIndex printOpen />} />
          <Route path="/arithmetic" element={<ArithmeticIndex />} />
          <Route path="/arithmetic/print" element={<ArithmeticIndex printOpen />} />
          <Route path="/time" element={<TimeIndex />} />
          <Route path="/time/print" element={<TimeIndex printOpen />} />
          <Route path="/fractions" element={<FractionsIndex />} />
          <Route path="/fractions/print" element={<FractionsIndex printOpen />} />
          <Route path="/shapes" element={<ShapesIndex />} />
          <Route path="/shapes/print" element={<ShapesIndex printOpen />} />
          <Route path="/charts" element={<ChartsIndex />} />
          <Route path="/charts/print" element={<ChartsIndex printOpen />} />
          <Route path="/number-sense" element={<NumberSenseIndex />} />
          <Route path="/number-sense/print" element={<NumberSenseIndex printOpen />} />
          <Route path="/money" element={<MoneyIndex />} />
          <Route path="/money/print" element={<MoneyIndex printOpen />} />
          <Route path="/decimals" element={<DecimalsIndex />} />
          <Route path="/decimals/print" element={<DecimalsIndex printOpen />} />
          <Route path="/number-theory" element={<NumberTheoryIndex />} />
          <Route path="/number-theory/print" element={<NumberTheoryIndex printOpen />} />
          <Route path="/conversions" element={<ConversionsIndex />} />
          <Route path="/conversions/print" element={<ConversionsIndex printOpen />} />
          <Route path="/word-problems" element={<WordProblemsIndex />} />
          <Route path="/word-problems/print" element={<WordProblemsIndex printOpen />} />
          <Route path="/ratio-proportion" element={<RatioProportionIndex />} />
          <Route path="/ratio-proportion/print" element={<RatioProportionIndex printOpen />} />
          <Route path="/algebra" element={<AlgebraIndex />} />
          <Route path="/algebra/print" element={<AlgebraIndex printOpen />} />
          <Route path="/statistics" element={<StatisticsIndex />} />
          <Route path="/statistics/print" element={<StatisticsIndex printOpen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
