#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import electronPath from "electron";

import { COMMAND_NAME } from "../shared/app.js";
import { parseCliArgs, renderHelp, CLI_VERSION } from "./args.js";
import { startServer } from "../backend/server/index.js";

export function runCli(args = process.argv.slice(2)): void {
  const options = parseCliArgs(args);
  if (options.action === "help") {
    console.log(renderHelp());
    return;
  }
  if (options.action === "version") {
    console.log(`${COMMAND_NAME} ${CLI_VERSION}`);
    return;
  }
  if (options.action === "ui") {
    launchElectronUi(options.port);
    return;
  }
  const started = startServer({ port: options.port });
  void started.ready.catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    started.server.close();
  });
}

export function launchElectronUi(port: number): ChildProcess {
  const executable = String(electronPath);
  if (executable.trim().length === 0) {
    throw new Error("Electron executable is unavailable. Run npm install before launching the UI.");
  }

  const electronMainPath = fileURLToPath(new URL("../electron/main.js", import.meta.url));
  const child = spawn(executable, [electronMainPath, "--port", String(port)], {
    stdio: "inherit"
  });
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
  return child;
}

function isDirectRun(): boolean {
  const scriptPath = process.argv[1];
  if (scriptPath === undefined) {
    return false;
  }
  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(scriptPath);
}

if (isDirectRun()) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
