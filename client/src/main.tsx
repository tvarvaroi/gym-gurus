import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initWebVitals } from "./lib/web-vitals";

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  initWebVitals();
}

createRoot(document.getElementById("root")!).render(<App />);
