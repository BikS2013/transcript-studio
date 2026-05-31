import { normalizeSonioxTranscript } from "../normalize.js";
import { getTranscriptionProvider, type ProviderTranscriptionRequest, type ProviderTranscriptionResult, type TranscriptionProviderAdapter } from "../providers.js";
import { appendFile, jsonRequest } from "./http.js";

const SONIOX_BASE_URL = "https://api.soniox.com/v1";
const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 900;

export function createSonioxAdapter(): TranscriptionProviderAdapter {
  return {
    info: getTranscriptionProvider("soniox"),
    transcribe: transcribeWithSoniox
  };
}

async function transcribeWithSoniox(request: ProviderTranscriptionRequest): Promise<ProviderTranscriptionResult> {
  const apiKey = requiredConfig(request.configValues, "SONIOX_API_KEY");
  const model = request.model ?? requiredConfig(request.configValues, "SONIOX_STT_MODEL");
  const headers = {
    Authorization: `Bearer ${apiKey}`
  };

  request.onProgress?.("Uploading audio to Soniox.");
  const form = new FormData();
  await appendFile(form, "file", request.inputPath);
  const upload = await jsonRequest(`${SONIOX_BASE_URL}/files`, {
    method: "POST",
    headers,
    body: form
  });
  const fileId = stringField(upload, "id") ?? stringField(upload, "file_id");
  if (fileId === undefined) {
    throw new Error("Soniox upload response did not include a file id");
  }

  request.onProgress?.("Creating Soniox transcription job.");
  const created = await jsonRequest(`${SONIOX_BASE_URL}/transcriptions`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      file_id: fileId,
      language_hints: request.languageHints,
      enable_speaker_diarization: request.diarize,
      enable_language_identification: request.languageHints.length === 0,
      client_reference_id: `transcript-studio:${Date.now().toString(36)}`
    })
  });
  const transcriptionId = stringField(created, "id") ?? stringField(created, "transcription_id");
  if (transcriptionId === undefined) {
    throw new Error("Soniox create-transcription response did not include a transcription id");
  }

  await pollTranscription(transcriptionId, headers, request.onProgress);

  request.onProgress?.("Fetching Soniox transcript.");
  const transcript = await jsonRequest(`${SONIOX_BASE_URL}/transcriptions/${encodeURIComponent(transcriptionId)}/transcript`, {
    method: "GET",
    headers
  });

  return {
    providerNativeJson: {
      upload,
      created,
      transcript
    },
    canonicalSegments: normalizeSonioxTranscript({
      transcript,
      providerResultPath: request.outputPlan.providerJsonPath,
      model
    })
  };
}

async function pollTranscription(
  transcriptionId: string,
  headers: Record<string, string>,
  onProgress?: (message: string) => void
): Promise<void> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const status = await jsonRequest(`${SONIOX_BASE_URL}/transcriptions/${encodeURIComponent(transcriptionId)}`, {
      method: "GET",
      headers
    });
    const state = (stringField(status, "status") ?? stringField(status, "state") ?? "").toLowerCase();
    onProgress?.(`Soniox transcription status: ${state || "unknown"}.`);
    if (state === "completed" || state === "complete" || state === "done") {
      return;
    }
    if (state === "failed" || state === "error") {
      const message = stringField(status, "error_message") ?? stringField(status, "error") ?? "Soniox transcription failed";
      throw new Error(message);
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error("Soniox transcription timed out before completion");
}

function requiredConfig(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required for Soniox transcription`);
  }
  return value.trim();
}

function stringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const field = value[key];
  return typeof field === "string" && field.trim().length > 0 ? field.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
