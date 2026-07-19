import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Self-hosted Nunito (no CDN request; works offline / in the PWA).
// latin + latin-ext cover en/pt/es/fr; other subsets stay out of the precache.
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-ext-400.css";
import "@fontsource/nunito/latin-ext-600.css";
import "@fontsource/nunito/latin-ext-700.css";
import "@fontsource/nunito/latin-ext-800.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
