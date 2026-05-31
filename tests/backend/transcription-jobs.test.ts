import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { getTranscriptionJob, startTranscriptionJobs } from "../../src/backend/transcription/jobs.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

describe("transcription job execution", () => {
  it.skipIf(process.platform !== "darwin")("runs Apple local jobs through the configured helper and writes both outputs", async () => {
    const dir = await createTempDir();
    const inputPath = join(dir, "meeting.m4a");
    const helperPath = join(dir, "apple-helper");
    await writeFile(inputPath, "audio", "utf8");
    await writeFile(
      helperPath,
      `#!/bin/sh
printf '{"segments":[{"text":"hello local","startMs":0,"endMs":500,"confidence":0.9}]}'`,
      "utf8"
    );
    await chmod(helperPath, 0o700);

    try {
      const started = await startTranscriptionJobs({
        request: {
          inputPaths: [inputPath],
          providerId: "apple-local",
          languageHints: ["en-US"],
          diarize: false
        },
        configSources: {
          env: {
            TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE: "en-US",
            TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH: helperPath
          },
          homeDir: "/missing-home",
          projectRoot: "/missing-project"
        },
        now: new Date("2026-05-31T14:30:12.000Z")
      });

      const jobId = started.jobs[0]?.id;
      expect(jobId).toBeDefined();
      const completed = await waitForTerminalJob(jobId as string);

      expect(completed.state).toBe("succeeded");
      expect(completed.outputs[0]).toMatchObject({
        canonicalSegmentCount: 1
      });
      expect(await readFile(completed.outputs[0]?.canonicalJsonlPath as string, "utf8")).toContain("hello local");
      expect(await readFile(completed.outputs[0]?.providerJsonPath as string, "utf8")).toContain("segments");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

async function waitForTerminalJob(jobId: string): Promise<ReturnType<typeof getTranscriptionJob>> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const job = getTranscriptionJob(jobId);
    if (job.state === "succeeded" || job.state === "failed") {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return getTranscriptionJob(jobId);
}
