import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Light theme by default; the toggle in the header stores the choice
try {
  const saved = localStorage.getItem("theme");
  document.documentElement.classList.toggle("dark", saved === "dark");
} catch { /* storage unavailable */ }

createRoot(document.getElementById("root")!).render(<App />);
