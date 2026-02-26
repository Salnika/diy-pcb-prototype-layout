import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css.ts";
import { themeClass } from "./styles/theme.css";
import { AppStoreProvider } from "./app/store";
import { DialogGatewayContext, browserDialogGateway } from "./app/effects/dialogGateway";
import { StorageGatewayContext, browserStorageGateway } from "./app/effects/storageGateway";

document.documentElement.classList.add(themeClass);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StorageGatewayContext.Provider value={browserStorageGateway}>
      <DialogGatewayContext.Provider value={browserDialogGateway}>
        <AppStoreProvider>
          <App />
        </AppStoreProvider>
      </DialogGatewayContext.Provider>
    </StorageGatewayContext.Provider>
  </React.StrictMode>,
);
