import { access, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { FFMPEG_EXECUTABLE } from "../config/prerequisites.js";
import type { ProcessingKind, ProcessingPlan, ProcessingPlanRequest } from "../../shared/types.js";

export class OutputCollisionError extends Error {
  constructor(public readonly outputPath: string) {
    super(`Refusing to overwrite existing output: ${outputPath}`);
    this.name = "OutputCollisionError";
  }
}

export async function buildProcessingPlan(request: ProcessingPlanRequest): Promise<ProcessingPlan> {
  validateRequest(request);
  await assertOutputDoesNotExist(request.outputPath);
  await assertParentDirectoryExists(request.outputPath);

  switch (request.kind) {
    case "mix":
      return buildMixPlan(request.inputPaths, request.outputPath);
    case "source-separated":
      return buildSourceSeparatedPlan(request.inputPaths, request.outputPath);
    case "denoise":
      return buildDenoisePlan(request.inputPaths, request.outputPath, request.denoisePreset);
    case "loudness":
      return buildLoudnessPlan(request.inputPaths, request.outputPath, request.loudnessTarget);
  }
}

export function buildMixPlan(inputPaths: string[], outputPath: string): ProcessingPlan {
  requireInputs(inputPaths, "mix", 1);
  const args = [
    "-hide_banner",
    "-n",
    ...inputArgs(inputPaths),
    "-filter_complex",
    `amix=inputs=${inputPaths.length}:duration=longest:dropout_transition=0,alimiter=limit=0.95`,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outputPath
  ];
  return plan("mix", args, outputPath);
}

export function buildSourceSeparatedPlan(inputPaths: string[], outputPath: string): ProcessingPlan {
  requireInputs(inputPaths, "source-separated", 1);
  const maps = inputPaths.flatMap((_, index) => ["-map", `${index}:a:0`]);
  const args = [
    "-hide_banner",
    "-n",
    ...inputArgs(inputPaths),
    ...maps,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outputPath
  ];
  return plan("source-separated", args, outputPath, [
    "Source-separated export preserves each input as a separate audio stream in one output container; it is not AI source separation."
  ]);
}

export function buildDenoisePlan(
  inputPaths: string[],
  outputPath: string,
  denoisePreset: "conservative" | undefined
): ProcessingPlan {
  requireInputs(inputPaths, "denoise", 1, 1);
  if (denoisePreset !== undefined && denoisePreset !== "conservative") {
    throw new Error(`Unsupported denoise preset: ${denoisePreset}`);
  }
  const args = [
    "-hide_banner",
    "-n",
    "-i",
    inputPaths[0] as string,
    "-af",
    "afftdn=nf=-25",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outputPath
  ];
  return plan("denoise", args, outputPath, ["Conservative denoise uses FFmpeg afftdn and may need auditory review."]);
}

export function buildLoudnessPlan(
  inputPaths: string[],
  outputPath: string,
  loudnessTarget: string | undefined
): ProcessingPlan {
  requireInputs(inputPaths, "loudness", 1, 1);
  const target = loudnessTarget ?? "I=-16:TP=-1.5:LRA=11";
  if (!/^I=-?\d+(?:\.\d+)?:TP=-?\d+(?:\.\d+)?:LRA=\d+(?:\.\d+)?$/.test(target)) {
    throw new Error(`Invalid loudness target. Expected I=<LUFS>:TP=<dB>:LRA=<LU>: ${target}`);
  }
  const args = [
    "-hide_banner",
    "-n",
    "-i",
    inputPaths[0] as string,
    "-af",
    `loudnorm=${target}:print_format=json`,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outputPath
  ];
  return plan("loudness", args, outputPath, [
    "Loudness plan emits loudnorm stats on stderr when executed by a job runner."
  ]);
}

export async function assertOutputDoesNotExist(outputPath: string): Promise<void> {
  try {
    await access(outputPath);
    throw new OutputCollisionError(outputPath);
  } catch (error) {
    if (error instanceof OutputCollisionError) {
      throw error;
    }
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function validateRequest(request: ProcessingPlanRequest): void {
  if (!isProcessingKind(request.kind)) {
    throw new Error(`Unsupported processing kind: ${String(request.kind)}`);
  }
  if (!Array.isArray(request.inputPaths)) {
    throw new Error("inputPaths must be an array");
  }
  if (typeof request.outputPath !== "string" || request.outputPath.trim().length === 0) {
    throw new Error("outputPath is required");
  }
  for (const inputPath of request.inputPaths) {
    if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
      throw new Error("inputPaths must contain only non-empty strings");
    }
  }
  const resolvedOutput = resolve(request.outputPath);
  for (const inputPath of request.inputPaths) {
    if (resolve(inputPath) === resolvedOutput) {
      throw new Error(`Output path must not equal an input path: ${request.outputPath}`);
    }
  }
}

async function assertParentDirectoryExists(outputPath: string): Promise<void> {
  const parent = dirname(outputPath);
  const info = await stat(parent);
  if (!info.isDirectory()) {
    throw new Error(`Output parent path is not a directory: ${parent}`);
  }
}

function isProcessingKind(value: unknown): value is ProcessingKind {
  return value === "mix" || value === "source-separated" || value === "denoise" || value === "loudness";
}

function requireInputs(inputPaths: string[], kind: ProcessingKind, min: number, max?: number): void {
  if (inputPaths.length < min) {
    throw new Error(`${kind} requires at least ${min} input path(s)`);
  }
  if (max !== undefined && inputPaths.length > max) {
    throw new Error(`${kind} accepts at most ${max} input path(s)`);
  }
  for (const inputPath of inputPaths) {
    if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
      throw new Error(`${kind} input paths must be non-empty strings`);
    }
  }
}

function inputArgs(inputPaths: string[]): string[] {
  return inputPaths.flatMap((inputPath) => ["-i", inputPath]);
}

function plan(
  kind: ProcessingKind,
  args: string[],
  outputPath: string,
  warnings: string[] = []
): ProcessingPlan {
  return {
    kind,
    command: {
      executable: FFMPEG_EXECUTABLE,
      args
    },
    outputPath,
    warnings
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
