import { normalizeElevenLabsTranscript } from "../normalize.js";
import { getTranscriptionProvider, type ProviderTranscriptionRequest, type ProviderTranscriptionResult, type TranscriptionProviderAdapter } from "../providers.js";
import { appendFile, jsonRequest } from "./http.js";

const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

export function createElevenLabsAdapter(): TranscriptionProviderAdapter {
  return {
    info: getTranscriptionProvider("elevenlabs"),
    transcribe: transcribeWithElevenLabs
  };
}

async function transcribeWithElevenLabs(request: ProviderTranscriptionRequest): Promise<ProviderTranscriptionResult> {
  const apiKey = requiredConfig(request.configValues, "ELEVENLABS_API_KEY");
  const model = request.model ?? requiredConfig(request.configValues, "ELEVENLABS_STT_MODEL");
  const form = new FormData();
  await appendFile(form, "file", request.inputPath);
  form.append("model_id", model);
  form.append("diarize", String(request.diarize));
  form.append("timestamps_granularity", "word");
  if (request.languageHints[0] !== undefined) {
    form.append("language_code", request.languageHints[0]);
  }

  request.onProgress?.("Uploading audio to ElevenLabs speech-to-text.");
  const transcript = await jsonRequest(ELEVENLABS_STT_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey
    },
    body: form
  });

  return {
    providerNativeJson: transcript,
    canonicalSegments: normalizeElevenLabsTranscript({
      transcript,
      providerResultPath: request.outputPlan.providerJsonPath,
      model
    })
  };
}

function requiredConfig(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required for ElevenLabs transcription`);
  }
  return value.trim();
}
