import { app, BrowserWindow } from "electron";

import { PRODUCT_NAME } from "../shared/app.js";
import { startServer } from "../backend/server/index.js";
import { electronPortFromArgs, localWorkspaceUrl } from "./config.js";

const port = electronPortFromArgs(process.argv.slice(2));
const started = startServer({ port, log: false });

async function createWindow(): Promise<void> {
  await started.ready;
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: PRODUCT_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await window.loadURL(localWorkspaceUrl(port));
}

app.whenReady().then(() => {
  void createWindow().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        app.quit();
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  started.server.close();
});
