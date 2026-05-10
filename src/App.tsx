import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import TimesTablesIndex from './modules/times-tables/TimesTablesIndex';
import ArithmeticIndex from './modules/arithmetic/ArithmeticIndex';
import TimeIndex from './modules/time/TimeIndex';
import FractionsIndex from './modules/fractions/FractionsIndex';
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
