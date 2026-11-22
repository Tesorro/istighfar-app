import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/literata/cyrillic-500.css";
import "@fontsource/literata/cyrillic-600.css";
import "@fontsource/manrope/cyrillic-400.css";
import "@fontsource/manrope/cyrillic-500.css";
import "@fontsource/manrope/cyrillic-600.css";
import { App } from "@/app/providers";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Корневой элемент не найден");
}
console.log("main.tsx");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
