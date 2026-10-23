import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./lib/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Medicao } from "./components/Medicao";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
        <Medicao />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
