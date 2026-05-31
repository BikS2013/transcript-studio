import { describe, expect, it } from "vitest";

import {
  normalizeAppleLocalTranscript,
  normalizeElevenLabsTranscript,
  normalizeSonioxTranscript,
  writeCanonicalJsonl
} from "../../src/backend/transcription/normalize.js";

describe("transcription normalization", () => {
  it("groups Soniox token timing into canonical JSONL-compatible segments", () => {
    const segments = normalizeSonioxTranscript({
      providerResultPath: "/tmp/meeting.transcript-studio.soniox.20260531T143012Z.provider.json",
      model: "stt-async-v3",
      transcript: {
        tokens: [
          { text: "Hello", start_ms: 0, end_ms: 300, speaker: "speaker_0", language: "en", confidence: 0.9 },
          { text: "world.", start_ms: 310, end_ms: 700, speaker: "speaker_0", language: "en", confidence: 0.8 },
          { text: "Next", start_ms: 5_000, end_ms: 5_300, speaker: "speaker_1", language: "en", confidence: 0.7 }
        ]
      }
    });

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      text: "Hello world.",
      startMs: 0,
      durationSec: 0.7,
      speaker: "speaker_0",
      source: "transcription:soniox",
      provider: "soniox",
      providerResultRef: "meeting.transcript-studio.soniox.20260531T143012Z.provider.json"
    });
  });

  it("preserves Soniox v4 token spacing for subword tokens", () => {
    const segments = normalizeSonioxTranscript({
      providerResultPath: "/tmp/meeting.transcript-studio.soniox.20260531T143012Z.provider.json",
      model: "stt-async-v4",
      transcript: {
        tokens: [
          { text: "I", start_ms: 1_560, end_ms: 1_620, language: "en", confidence: 0.99 },
          { text: " gu", start_ms: 1_680, end_ms: 1_740, language: "en", confidence: 0.99 },
          { text: "ess", start_ms: 1_740, end_ms: 1_800, language: "en", confidence: 0.99 },
          { text: " y", start_ms: 1_980, end_ms: 2_040, language: "en", confidence: 0.99 },
          { text: "ou", start_ms: 2_040, end_ms: 2_100, language: "en", confidence: 0.99 },
          { text: " are", start_ms: 2_220, end_ms: 2_280, language: "en", confidence: 0.96 },
          { text: " in", start_ms: 2_400, end_ms: 2_460, language: "en", confidence: 0.99 },
          { text: " Gre", start_ms: 2_580, end_ms: 2_640, language: "en", confidence: 0.99 },
          { text: "ece", start_ms: 2_700, end_ms: 2_760, language: "en", confidence: 0.56 },
          { text: "?", start_ms: 2_880, end_ms: 2_940, language: "en", confidence: 0.99 }
        ]
      }
    });

    expect(segments[0]?.text).toBe("I guess you are in Greece?");
  });

  it("normalizes ElevenLabs words and preserves language metadata", () => {
    const segments = normalizeElevenLabsTranscript({
      providerResultPath: "/tmp/meeting.transcript-studio.elevenlabs.20260531T143012Z.provider.json",
      model: "scribe_v2",
      transcript: {
        language_code: "en",
        words: [
          { text: "Good", start: 1, end: 1.2, speaker_id: "speaker_0", confidence: 0.95 },
          { text: "morning.", start: 1.2, end: 1.7, speaker_id: "speaker_0", confidence: 0.9 }
        ]
      }
    });

    expect(segments[0]).toMatchObject({
      text: "Good morning.",
      startMs: 1000,
      language: "en",
      provider: "elevenlabs"
    });
  });

  it("normalizes Apple helper segment JSON", () => {
    const segments = normalizeAppleLocalTranscript({
      providerResultPath: "/tmp/meeting.transcript-studio.apple-local.20260531T143012Z.provider.json",
      locale: "en-US",
      transcript: {
        segments: [{ text: "Local speech", startMs: 100, endMs: 900, confidence: 0.88 }]
      }
    });

    expect(segments[0]).toMatchObject({
      text: "Local speech",
      startMs: 100,
      durationSec: 0.8,
      language: "en-US",
      provider: "apple-local"
    });
    expect(writeCanonicalJsonl(segments)).toContain('"provider":"apple-local"');
  });
});
