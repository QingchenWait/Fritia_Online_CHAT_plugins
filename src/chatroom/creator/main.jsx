import React from "react";
import { createRoot } from "react-dom/client";
import CreatorApp from "./CreatorApp.jsx";
import { AuthProvider } from "./auth.jsx";
import "./creator.css";

createRoot(document.getElementById("creator-root")).render(
  <React.StrictMode>
    <AuthProvider><CreatorApp /></AuthProvider>
  </React.StrictMode>,
);
