import { afterEach, describe, expect, it, vi } from "vitest";

import { StudioApiClient } from "../../src/frontend/api/client.js";
import type { DroppedMediaResult, DroppedTranscriptResult, ProbeResult, TranscriptBundle } from "../../src/shared/types.js";

describe("StudioApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("unwraps the backend probe results array for the UI", async () => {
    const probeResult: ProbeResult = {
      path: "/tmp/a.m4a",
      track: {
        id: "track-a",
        path: "/tmp/a.m4a",
        fileName: "a.m4a",
        displayName: "a.m4a",
        durationSec: 1,
        tags: {},
        selected: true,
        muted: false,
        solo: false,
        offsetMs: 0,
        status: "ready",
        derivedOutputIds: []
      }
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ results: [probeResult] }))
    );

    await expect(new StudioApiClient().probe("/tmp/a.m4a")).resolves.toEqual(probeResult);
  });

  it("sends transcript export payloads with the backend bundle key", async () => {
    const fetchMock = vi.fn(async () => response({ outputPath: "/tmp/export.html", html: "<html></html>" }));
    vi.stubGlobal("fetch", fetchMock);
    const bundle: TranscriptBundle = {
      id: "bundle-a",
      sources: [],
      segments: [],
      annotations: [],
      paragraphs: []
    };

    await new StudioApiClient().exportTranscriptHtml({
      outputPath: "/tmp/export.html",
      transcriptBundle: bundle
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transcripts/export-html",
      expect.objectContaining({
        body: JSON.stringify({
          outputPath: "/tmp/export.html",
          bundle
        })
      })
    );
  });

  it("loads multiple transcript paths with the backend paths key", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        id: "bundle-a",
        sources: [],
        segments: [],
        annotations: [],
        paragraphs: []
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await new StudioApiClient().loadTranscript(["/tmp/a.jsonl", "/tmp/b.jsonl"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transcripts/load",
      expect.objectContaining({
        body: JSON.stringify({ paths: ["/tmp/a.jsonl", "/tmp/b.jsonl"] })
      })
    );
  });

  it("uses the transcription provider endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        providers: [],
        warnings: []
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await new StudioApiClient().listTranscriptionProviders();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transcription/providers",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("sends transcription planning payloads to the backend", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        provider: {
          id: "apple-local",
          label: "Apple local speech",
          privacyMode: "local",
          capabilities: {
            speakerDiarization: "unsupported",
            segmentTimestamps: "supported",
            languageDetection: "unsupported",
            multiLanguage: "unknown",
            confidenceScores: "supported",
            localOnly: true
          }
        },
        languageHints: ["en-US"],
        diarize: false,
        outputs: [],
        warnings: []
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await new StudioApiClient().planTranscription({
      inputPaths: ["/tmp/a.m4a"],
      providerId: "apple-local",
      languageHints: ["en-US"],
      diarize: false
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transcription/plan",
      expect.objectContaining({
        body: JSON.stringify({
          inputPaths: ["/tmp/a.m4a"],
          providerId: "apple-local",
          languageHints: ["en-US"],
          diarize: false
        })
      })
    );
  });

  it("uploads dropped M4A files to the local staging endpoint", async () => {
    const staged: DroppedMediaResult = {
      originalFileName: "session.m4a",
      stagedFileName: "session-abc123.m4a",
      path: "/tmp/.transcript-studio/dropped-media/session-abc123.m4a",
      sizeBytes: 12,
      sha256: "abc123"
    };
    const fetchMock = vi.fn(async () => response(staged));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array([1, 2, 3])], "session.m4a", { type: "audio/mp4" });

    await expect(new StudioApiClient().uploadDroppedM4a(file)).resolves.toEqual(staged);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dropped-media?filename=session.m4a",
      expect.objectContaining({
        method: "POST",
        body: file
      })
    );
  });

  it("explains stale backends when dropped upload endpoint is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ error: "Not found" }, { ok: false, status: 404 })));
    const file = new File([new Uint8Array([1, 2, 3])], "session.m4a", { type: "audio/mp4" });

    await expect(new StudioApiClient().uploadDroppedM4a(file)).rejects.toThrow(
      "Dropped-file upload endpoint is unavailable. Restart Transcript Studio after rebuilding."
    );
  });

  it("uploads dropped JSONL transcript files to the local staging endpoint", async () => {
    const staged: DroppedTranscriptResult = {
      originalFileName: "transcript.jsonl",
      stagedFileName: "transcript-abc123.jsonl",
      path: "/tmp/.transcript-studio/dropped-transcripts/transcript-abc123.jsonl",
      sizeBytes: 12,
      sha256: "abc123"
    };
    const fetchMock = vi.fn(async () => response(staged));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array([1, 2, 3])], "transcript.jsonl", { type: "application/json" });

    await expect(new StudioApiClient().uploadDroppedTranscript(file)).resolves.toEqual(staged);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dropped-transcripts?filename=transcript.jsonl",
      expect.objectContaining({
        method: "POST",
        body: file
      })
    );
  });
});

function response(payload: unknown, options?: { ok?: boolean; status?: number }): Response {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    text: async () => JSON.stringify(payload)
  } as Response;
}
