import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import TimesTablesIndex from './modules/times-tables/TimesTablesIndex';
import TimesTablesPrint from './modules/times-tables/TimesTablesPrint';
import ArithmeticIndex from './modules/arithmetic/ArithmeticIndex';
import ArithmeticPrint from './modules/arithmetic/ArithmeticPrint';
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
        <Route path="/times-tables/print" element={<TimesTablesPrint />} />
        <Route path="/arithmetic" element={<ArithmeticIndex />} />
        <Route path="/arithmetic/print" element={<ArithmeticPrint />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
