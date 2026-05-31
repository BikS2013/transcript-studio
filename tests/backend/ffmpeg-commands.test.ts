import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { buildMixPlan, buildProcessingPlan, OutputCollisionError } from "../../src/backend/ffmpeg/commands.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

describe("FFmpeg command construction", () => {
  it("builds a shell-free command object with an executable and args array", () => {
    const plan = buildMixPlan(["/media/a.m4a", "/media/b.m4a"], "/tmp/output.m4a");

    expect(plan).toEqual({
      kind: "mix",
      command: {
        executable: "ffmpeg",
        args: [
          "-hide_banner",
          "-n",
          "-i",
          "/media/a.m4a",
          "-i",
          "/media/b.m4a",
          "-filter_complex",
          "amix=inputs=2:duration=longest:dropout_transition=0,alimiter=limit=0.95",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "/tmp/output.m4a"
        ]
      },
      outputPath: "/tmp/output.m4a",
      warnings: []
    });
  });

  it("rejects output paths that collide with an input path before planning", async () => {
    await expect(
      buildProcessingPlan({
        kind: "mix",
        inputPaths: ["/tmp/session/input.m4a"],
        outputPath: "/tmp/session/input.m4a"
      })
    ).rejects.toThrow("Output path must not equal an input path: /tmp/session/input.m4a");
  });

  it("rejects output files that already exist", async () => {
    const dir = await createTempDir();
    const outputPath = join(dir, "mix.m4a");
    await writeFile(outputPath, "existing output", "utf8");

    try {
      await expect(
        buildProcessingPlan({
          kind: "mix",
          inputPaths: ["/tmp/session/source-a.m4a"],
          outputPath
        })
      ).rejects.toBeInstanceOf(OutputCollisionError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
