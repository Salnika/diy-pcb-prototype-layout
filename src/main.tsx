import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css.ts";
import { themeClass } from "./styles/theme.css";
import { AppStoreProvider } from "./app/store";

document.documentElement.classList.add(themeClass);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </React.StrictMode>,
);
