import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import TimesTablesIndex from './modules/times-tables/TimesTablesIndex';
import ArithmeticIndex from './modules/arithmetic/ArithmeticIndex';
import TimeIndex from './modules/time/TimeIndex';
import FractionsIndex from './modules/fractions/FractionsIndex';
import ShapesIndex from './modules/shapes/ShapesIndex';
import ChartsIndex from './modules/charts/ChartsIndex';
import NumberSenseIndex from './modules/number-sense/NumberSenseIndex';
import MoneyIndex from './modules/money/MoneyIndex';
import DecimalsIndex from './modules/decimals/DecimalsIndex';
import NumberTheoryIndex from './modules/number-theory/NumberTheoryIndex';
import ConversionsIndex from './modules/conversions/ConversionsIndex';
import WordProblemsIndex from './modules/word-problems/WordProblemsIndex';
import NotFound from './pages/NotFound';
import { getTheme, applyTheme } from '@/lib/themeStorage';

const App = () => {
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
