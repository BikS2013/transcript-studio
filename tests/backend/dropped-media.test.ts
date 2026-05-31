import { readFile, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import { stageDroppedM4a, stageDroppedTranscript } from "../../src/backend/media/drop.js";

const tempDirs: string[] = [];

describe("dropped M4A staging", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("stages dropped M4A files with a content-hash path", async () => {
    const rootDir = await tempRoot();
    const result = await stageDroppedM4a({
      fileName: "Meeting Take.m4a",
      rootDir,
      source: Readable.from(Buffer.from("m4a bytes"))
    });

    expect(result.originalFileName).toBe("Meeting Take.m4a");
    expect(result.stagedFileName).toMatch(/^Meeting-Take-[a-f0-9]{16}\.m4a$/);
    expect(result.path).toBe(join(rootDir, result.stagedFileName));
    await expect(readFile(result.path, "utf8")).resolves.toBe("m4a bytes");
  });

  it("maps duplicate dropped content to the same staged path", async () => {
    const rootDir = await tempRoot();
    const first = await stageDroppedM4a({
      fileName: "track.m4a",
      rootDir,
      source: Readable.from(Buffer.from("same audio"))
    });
    const second = await stageDroppedM4a({
      fileName: "track.m4a",
      rootDir,
      source: Readable.from(Buffer.from("same audio"))
    });

    expect(second.path).toBe(first.path);
    await expect(stat(first.path)).resolves.toMatchObject({ size: "same audio".length });
  });

  it("rejects unsupported file extensions before staging", async () => {
    const rootDir = await tempRoot();
    await expect(
      stageDroppedM4a({
        fileName: "notes.txt",
        rootDir,
        source: Readable.from(Buffer.from("not audio"))
      })
    ).rejects.toThrow("Dropped file must be an M4A file: notes.txt");
  });

  it("stages dropped JSONL transcript files separately", async () => {
    const rootDir = await tempRoot();
    const result = await stageDroppedTranscript({
      fileName: "transcript.jsonl",
      rootDir,
      source: Readable.from(Buffer.from("{\"text\":\"hello\"}\n"))
    });

    expect(result.stagedFileName).toMatch(/^transcript-[a-f0-9]{16}\.jsonl$/);
    expect(result.path).toBe(join(rootDir, result.stagedFileName));
    await expect(readFile(result.path, "utf8")).resolves.toBe("{\"text\":\"hello\"}\n");
  });

  it("rejects non-JSONL transcript files before staging", async () => {
    const rootDir = await tempRoot();
    await expect(
      stageDroppedTranscript({
        fileName: "transcript.txt",
        rootDir,
        source: Readable.from(Buffer.from("not jsonl"))
      })
    ).rejects.toThrow("Dropped file must be a JSONL transcript file: transcript.txt");
  });
});

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "sync-transcript-drop-"));
  tempDirs.push(dir);
  return dir;
}
