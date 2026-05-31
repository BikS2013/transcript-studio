#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import electronPath from "electron";

import { COMMAND_NAME } from "../shared/app.js";
import { parseCliArgs, renderHelp, CLI_VERSION, type TranscribeCliOptions } from "./args.js";
import { startServer } from "../backend/server/index.js";
import { loadSessionManifest } from "../backend/session/manifest.js";
import { getTranscriptionJob, startTranscriptionJobs } from "../backend/transcription/jobs.js";
import type { TranscriptionJob, TranscriptionPlanRequest } from "../shared/types.js";

export async function runCli(args = process.argv.slice(2)): Promise<void> {
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
  if (options.action === "transcribe") {
    await runTranscribe(options.transcribe);
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

async function runTranscribe(options: TranscribeCliOptions | undefined): Promise<void> {
  if (options === undefined) {
    throw new Error("Missing transcribe options");
  }
  const request = await transcribeRequestFromCli(options);
  const started = await startTranscriptionJobs({ request });
  console.log(`Started ${started.jobs.length} transcription job(s).`);
  const completed: TranscriptionJob[] = [];
  while (completed.length < started.jobs.length) {
    completed.length = 0;
    for (const job of started.jobs) {
      const latest = getTranscriptionJob(job.id);
      console.log(`${latest.id}: ${latest.state} - ${latest.progressText}`);
      if (latest.state === "succeeded" || latest.state === "failed") {
        completed.push(latest);
      }
    }
    if (completed.length < started.jobs.length) {
      await delay(1_000);
    }
  }

  const failed = completed.filter((job) => job.state === "failed");
  for (const job of completed) {
    if (job.state === "succeeded") {
      for (const output of job.outputs) {
        console.log(`Canonical JSONL: ${output.canonicalJsonlPath}`);
        console.log(`Provider JSON: ${output.providerJsonPath}`);
      }
    } else {
      console.error(`${job.id} failed: ${job.error ?? "Unknown transcription error"}`);
    }
  }
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function transcribeRequestFromCli(options: TranscribeCliOptions): Promise<TranscriptionPlanRequest> {
  const inputPaths = options.sessionPath === undefined
    ? options.inputPaths
    : (await loadSessionManifest(options.sessionPath)).tracks.map((track) => track.path);
  return {
    inputPaths,
    ...(options.providerId === undefined ? {} : { providerId: options.providerId }),
    ...(options.languageHints === undefined ? {} : { languageHints: options.languageHints }),
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.diarize === undefined ? {} : { diarize: options.diarize }),
    confirmExternalUpload: options.confirmExternalUpload === true,
    failOnCapabilityGap: options.failOnCapabilityGap === true
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isDirectRun(): boolean {
  const scriptPath = process.argv[1];
  if (scriptPath === undefined) {
    return false;
  }
  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(scriptPath);
}

if (isDirectRun()) {
  void runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
