import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { IntroApp } from "./IntroApp";
import { initAnalytics } from "../analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IntroApp />
  </StrictMode>
);
