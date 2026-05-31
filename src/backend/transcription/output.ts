import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, extname, resolve } from "node:path";

import { assertOutputDoesNotExist } from "../ffmpeg/commands.js";
import type { TranscriptionOutputPlan, TranscriptionProviderId } from "../../shared/types.js";

export async function planTranscriptionOutputs(input: {
  inputPaths: string[];
  providerId: TranscriptionProviderId;
  now?: Date;
}): Promise<TranscriptionOutputPlan[]> {
  const inputPaths = validateInputPaths(input.inputPaths);
  const timestamp = formatOutputTimestamp(input.now ?? new Date());
  const plans = inputPaths.map((inputPath) => buildOutputPlan(inputPath, input.providerId, timestamp));
  ensureUniquePlannedOutputs(plans);

  for (const inputPath of inputPaths) {
    await assertM4aInputFile(inputPath);
  }
  for (const plan of plans) {
    await assertWritableDirectory(dirname(plan.canonicalJsonlPath));
    await assertOutputDoesNotExist(plan.canonicalJsonlPath);
    await assertOutputDoesNotExist(plan.providerJsonPath);
  }

  return plans;
}

export function buildOutputPlan(
  inputPath: string,
  providerId: TranscriptionProviderId,
  timestamp: string
): TranscriptionOutputPlan {
  const extension = extname(inputPath);
  const baseName = inputPath.slice(0, inputPath.length - extension.length);
  const outputBase = `${baseName}.transcript-studio.${providerId}.${timestamp}`;
  return {
    inputPath: resolve(inputPath),
    canonicalJsonlPath: resolve(`${outputBase}.jsonl`),
    providerJsonPath: resolve(`${outputBase}.provider.json`)
  };
}

export function formatOutputTimestamp(date: Date): string {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function validateInputPaths(inputPaths: string[]): string[] {
  if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
    throw new Error("inputPaths must contain at least one M4A file path");
  }
  return inputPaths.map((inputPath) => {
    if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
      throw new Error("inputPaths must contain only non-empty strings");
    }
    return resolve(inputPath);
  });
}

async function assertM4aInputFile(inputPath: string): Promise<void> {
  if (extname(inputPath).toLowerCase() !== ".m4a") {
    throw new Error(`Transcription input must be an M4A file: ${inputPath}`);
  }
  const info = await stat(inputPath);
  if (!info.isFile()) {
    throw new Error(`Transcription input path is not a file: ${inputPath}`);
  }
}

async function assertWritableDirectory(directoryPath: string): Promise<void> {
  const info = await stat(directoryPath);
  if (!info.isDirectory()) {
    throw new Error(`Transcription output parent path is not a directory: ${directoryPath}`);
  }
  await access(directoryPath, constants.W_OK);
}

function ensureUniquePlannedOutputs(plans: TranscriptionOutputPlan[]): void {
  const seen = new Set<string>();
  for (const plan of plans) {
    for (const outputPath of [plan.canonicalJsonlPath, plan.providerJsonPath]) {
      if (seen.has(outputPath)) {
        throw new Error(`Duplicate transcription output path planned: ${outputPath}`);
      }
      seen.add(outputPath);
    }
    if (resolve(plan.inputPath) === resolve(plan.canonicalJsonlPath) || resolve(plan.inputPath) === resolve(plan.providerJsonPath)) {
      throw new Error(`Transcription output path must not equal the input path: ${plan.inputPath}`);
    }
  }
}
