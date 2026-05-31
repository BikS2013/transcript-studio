import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { OutputCollisionError } from "../../src/backend/ffmpeg/commands.js";
import { buildOutputPlan, formatOutputTimestamp, planTranscriptionOutputs } from "../../src/backend/transcription/output.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

describe("transcription output planning", () => {
  it("formats collision-safe timestamped sidecar names next to source audio", () => {
    expect(formatOutputTimestamp(new Date("2026-05-31T14:30:12.456Z"))).toBe("20260531T143012Z");
    expect(buildOutputPlan("/recordings/meeting.m4a", "soniox", "20260531T143012Z")).toMatchObject({
      inputPath: "/recordings/meeting.m4a",
      canonicalJsonlPath: "/recordings/meeting.transcript-studio.soniox.20260531T143012Z.jsonl",
      providerJsonPath: "/recordings/meeting.transcript-studio.soniox.20260531T143012Z.provider.json"
    });
  });

  it("plans canonical and provider-native outputs for existing M4A inputs", async () => {
    const dir = await createTempDir();
    const inputPath = join(dir, "meeting.m4a");
    await writeFile(inputPath, "audio", "utf8");

    try {
      await expect(
        planTranscriptionOutputs({
          inputPaths: [inputPath],
          providerId: "elevenlabs",
          now: new Date("2026-05-31T14:30:12.000Z")
        })
      ).resolves.toEqual([
        {
          inputPath,
          canonicalJsonlPath: join(dir, "meeting.transcript-studio.elevenlabs.20260531T143012Z.jsonl"),
          providerJsonPath: join(dir, "meeting.transcript-studio.elevenlabs.20260531T143012Z.provider.json")
        }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects output collisions before provider work starts", async () => {
    const dir = await createTempDir();
    const inputPath = join(dir, "meeting.m4a");
    const existingOutputPath = join(dir, "meeting.transcript-studio.soniox.20260531T143012Z.jsonl");
    await writeFile(inputPath, "audio", "utf8");
    await writeFile(existingOutputPath, "existing", "utf8");

    try {
      await expect(
        planTranscriptionOutputs({
          inputPaths: [inputPath],
          providerId: "soniox",
          now: new Date("2026-05-31T14:30:12.000Z")
        })
      ).rejects.toBeInstanceOf(OutputCollisionError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
