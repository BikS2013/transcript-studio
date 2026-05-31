import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  classifyRecord,
  groupTranscriptSegments,
  loadJsonlTranscripts,
  parseJsonlTranscript
} from "../../src/backend/transcript/jsonl.js";
import type { TranscriptSegment } from "../../src/shared/types.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

async function writeJsonlFile(filename: string, contents: string): Promise<{ dir: string; path: string }> {
  const dir = await createTempDir();
  const path = join(dir, filename);
  await writeFile(path, contents, "utf8");
  return { dir, path };
}

describe("transcript JSONL parsing", () => {
  it("normalizes representative segment fields, classifies QA sidecars as annotations, and groups paragraphs", async () => {
    const { dir, path } = await writeJsonlFile(
      "session.jsonl",
      [
        JSON.stringify({
          id: "seg-1",
          text: "Hello",
          speaker: "Ada",
          source: "meeting",
          model: "whisper",
          language: "en",
          durationSec: 1,
          timestamp: "00:00:01.250"
        }),
        JSON.stringify({
          id: "seg-2",
          text: "world",
          speaker: "Ada",
          source: "meeting",
          language: "en",
          timestamp: "00:00:03.000"
        }),
        JSON.stringify({
          id: "seg-3",
          text: "new topic",
          speaker: "Ada",
          source: "meeting",
          language: "en",
          timestamp: "00:00:08.500"
        }),
        JSON.stringify({
          id: "qa-1",
          question: "What should we do?",
          answer: "Ship it",
          timestamp: "00:00:09.000"
        })
      ].join("\n")
    );

    try {
      expect(
        classifyRecord({
          text: "Transcript-like text",
          question: "What should we do?",
          answer: "Ship it"
        })
      ).toBe("annotation");

      const bundle = await loadJsonlTranscripts([path]);

      expect(bundle.sources[0]).toMatchObject({
        path,
        fileName: "session.jsonl",
        recordCount: 4,
        segmentCount: 3,
        annotationCount: 1,
        errors: []
      });

      expect(bundle.segments).toHaveLength(3);
      expect(bundle.segments[0]).toMatchObject({
        id: "seg-1",
        sourcePath: path,
        lineNumber: 1,
        text: "Hello",
        speaker: "Ada",
        source: "meeting",
        model: "whisper",
        language: "en",
        startMs: 1_250,
        durationMs: 1_000
      });
      expect(bundle.segments[1]).toMatchObject({
        id: "seg-2",
        lineNumber: 2,
        text: "world",
        speaker: "Ada",
        source: "meeting",
        language: "en",
        startMs: 3_000
      });
      expect(bundle.annotations).toHaveLength(1);
      expect(bundle.annotations[0]).toMatchObject({
        id: "qa-1",
        lineNumber: 4,
        text: "Ship it",
        startMs: 9_000
      });

      expect(bundle.paragraphs).toHaveLength(2);
      expect(bundle.paragraphs[0]).toMatchObject({
        startMs: 1_250,
        endMs: 3_000,
        speaker: "Ada",
        source: "meeting",
        language: "en",
        segmentIds: ["seg-1", "seg-2"],
        text: "Hello world"
      });
      expect(bundle.paragraphs[1]).toMatchObject({
        startMs: 8_500,
        endMs: 8_500,
        segmentIds: ["seg-3"],
        text: "new topic"
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports malformed JSONL lines with the source path and line number", async () => {
    const malformedLine = "{\"text\":\"broken\"";
    const { dir, path } = await writeJsonlFile(
      "broken.jsonl",
      [
        JSON.stringify({
          text: "kept",
          speaker: "Ada",
          timestamp: "00:00:01.000"
        }),
        malformedLine,
        JSON.stringify({
          question: "What happened?",
          answer: "Parse error was isolated"
        })
      ].join("\n")
    );

    try {
      const parsed = parseJsonlTranscript(path, await readFile(path, "utf8"));

      expect(parsed.source).toMatchObject({
        path,
        fileName: "broken.jsonl",
        recordCount: 2,
        segmentCount: 1,
        annotationCount: 1
      });
      expect(parsed.source.errors).toHaveLength(1);
      expect(parsed.source.errors[0]).toMatchObject({
        path,
        lineNumber: 2,
        message: expect.stringContaining("Malformed JSON"),
        rawLine: malformedLine
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("transcript segment grouping", () => {
  it("starts a new paragraph when the speaker or timing gap changes", () => {
    const segments: TranscriptSegment[] = [
      {
        id: "seg-a",
        sourceId: "source-a",
        sourcePath: "/tmp/session.jsonl",
        lineNumber: 1,
        text: "one",
        speaker: "Ada",
        source: "meeting",
        language: "en",
        startMs: 0,
        durationMs: 1_000,
        raw: {}
      },
      {
        id: "seg-b",
        sourceId: "source-a",
        sourcePath: "/tmp/session.jsonl",
        lineNumber: 2,
        text: "two",
        speaker: "Ada",
        source: "meeting",
        language: "en",
        startMs: 2_500,
        raw: {}
      },
      {
        id: "seg-c",
        sourceId: "source-a",
        sourcePath: "/tmp/session.jsonl",
        lineNumber: 3,
        text: "three",
        speaker: "Ada",
        source: "meeting",
        language: "en",
        startMs: 6_000,
        raw: {}
      },
      {
        id: "seg-d",
        sourceId: "source-a",
        sourcePath: "/tmp/session.jsonl",
        lineNumber: 4,
        text: "four",
        speaker: "Bob",
        source: "meeting",
        language: "en",
        startMs: 6_500,
        raw: {}
      }
    ];

    expect(groupTranscriptSegments(segments)).toEqual([
      {
        id: "paragraph-seg-a",
        startMs: 0,
        endMs: 2_500,
        speaker: "Ada",
        source: "meeting",
        language: "en",
        segmentIds: ["seg-a", "seg-b"],
        text: "one two"
      },
      {
        id: "paragraph-seg-c",
        startMs: 6_000,
        endMs: 6_000,
        speaker: "Ada",
        source: "meeting",
        language: "en",
        segmentIds: ["seg-c"],
        text: "three"
      },
      {
        id: "paragraph-seg-d",
        startMs: 6_500,
        endMs: 6_500,
        speaker: "Bob",
        source: "meeting",
        language: "en",
        segmentIds: ["seg-d"],
        text: "four"
      }
    ]);
  });
});
