import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/UI";
import { initI18n } from "./lib/i18n";   // ← SỬA DÒNG NÀY
import "./styles.css";
import "./styles-sky.css";
import "./styles-employee.css";

// ✅ Init i18n TRƯỚC khi render App
initI18n().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
});