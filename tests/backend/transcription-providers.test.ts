import { describe, expect, it } from "vitest";

import { getTranscriptionProvider, listTranscriptionProviders } from "../../src/backend/transcription/providers.js";

describe("transcription provider registry", () => {
  it("reports the supported provider IDs and privacy modes", () => {
    expect(listTranscriptionProviders().map((provider) => [provider.id, provider.privacyMode])).toEqual([
      ["soniox", "external-upload"],
      ["apple-local", "local"],
      ["elevenlabs", "external-upload"]
    ]);
  });

  it("marks Apple speaker diarization as unsupported until validated", () => {
    expect(getTranscriptionProvider("apple-local").capabilities.speakerDiarization).toBe("unsupported");
  });
});
