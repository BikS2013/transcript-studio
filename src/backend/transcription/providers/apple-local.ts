import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { normalizeAppleLocalTranscript } from "../normalize.js";
import { getTranscriptionProvider, type ProviderTranscriptionRequest, type ProviderTranscriptionResult, type TranscriptionProviderAdapter } from "../providers.js";

const execFileAsync = promisify(execFile);

export function createAppleLocalAdapter(): TranscriptionProviderAdapter {
  return {
    info: getTranscriptionProvider("apple-local"),
    transcribe: transcribeWithAppleLocal
  };
}

async function transcribeWithAppleLocal(request: ProviderTranscriptionRequest): Promise<ProviderTranscriptionResult> {
  if (process.platform !== "darwin") {
    throw new Error("Apple local transcription is supported only on macOS");
  }
  const helperPath = requiredConfig(request.configValues, "TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH");
  const locale = request.languageHints[0] ?? requiredConfig(request.configValues, "TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE");

  request.onProgress?.("Running Apple local transcription helper.");
  const { stdout, stderr } = await execFileAsync(helperPath, ["--input", request.inputPath, "--locale", locale], {
    maxBuffer: 100 * 1024 * 1024
  });
  if (stderr.trim().length > 0) {
    request.onProgress?.(stderr.trim());
  }
  const nativeJson = parseHelperJson(stdout);
  return {
    providerNativeJson: nativeJson,
    canonicalSegments: normalizeAppleLocalTranscript({
      transcript: nativeJson,
      providerResultPath: request.outputPlan.providerJsonPath,
      locale
    })
  };
}

function parseHelperJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout) as unknown;
  } catch (error) {
    throw new Error(`Apple transcription helper did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function requiredConfig(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required for Apple local transcription`);
  }
  return value.trim();
}
