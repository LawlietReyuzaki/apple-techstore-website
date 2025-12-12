import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force dark mode globally
document.documentElement.classList.remove("light");
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
