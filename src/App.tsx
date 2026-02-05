import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PrintResources from "./pages/PrintResources";
import NotFound from "./pages/NotFound";
import { getTheme, applyTheme } from "@/lib/themeStorage";

const App = () => {
  useEffect(() => {
    // Apply saved theme on app load
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/print" element={<PrintResources />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
