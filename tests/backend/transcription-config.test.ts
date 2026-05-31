import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  resolveTranscriptionConfig,
  validateTranscriptionJobConfig
} from "../../src/backend/transcription/config.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

describe("transcription configuration", () => {
  it("requires a configured default provider when a job does not select one", async () => {
    const config = await resolveTranscriptionConfig({ env: {}, homeDir: "/missing-home", projectRoot: "/missing-project" });

    expect(() =>
      validateTranscriptionJobConfig({
        request: { inputPaths: ["/tmp/a.m4a"] },
        config
      })
    ).toThrow("TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER is required when no provider is selected");
  });

  it("uses provider overrides without silently falling back to the configured default", async () => {
    const config = await resolveTranscriptionConfig({
      env: {
        TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER: "apple-local",
        SONIOX_API_KEY: "soniox-key",
        SONIOX_API_KEY_EXPIRES_AT: "2030-01-01T00:00:00.000Z",
        SONIOX_STT_MODEL: "soniox-model"
      },
      homeDir: "/missing-home",
      projectRoot: "/missing-project"
    });

    expect(
      validateTranscriptionJobConfig({
        request: {
          inputPaths: ["/tmp/a.m4a"],
          providerId: "soniox",
          confirmExternalUpload: true
        },
        config,
        now: new Date("2026-05-31T00:00:00.000Z")
      })
    ).toMatchObject({
      providerId: "soniox",
      model: "soniox-model"
    });
  });

  it("fails external provider jobs before upload consent is confirmed", async () => {
    const config = await resolveTranscriptionConfig({
      env: {
        TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER: "soniox",
        SONIOX_API_KEY: "soniox-key",
        SONIOX_STT_MODEL: "soniox-model"
      },
      homeDir: "/missing-home",
      projectRoot: "/missing-project"
    });

    expect(() =>
      validateTranscriptionJobConfig({
        request: { inputPaths: ["/tmp/a.m4a"] },
        config
      })
    ).toThrow("Transcription provider soniox uploads source audio; confirmExternalUpload is required");
  });

  it("fails expired API keys and warns for credentials expiring soon", async () => {
    const expired = await resolveTranscriptionConfig({
      env: {
        ELEVENLABS_API_KEY: "eleven-key",
        ELEVENLABS_API_KEY_EXPIRES_AT: "2026-01-01",
        ELEVENLABS_STT_MODEL: "scribe_v2"
      },
      homeDir: "/missing-home",
      projectRoot: "/missing-project"
    });

    expect(() =>
      validateTranscriptionJobConfig({
        request: {
          inputPaths: ["/tmp/a.m4a"],
          providerId: "elevenlabs",
          confirmExternalUpload: true
        },
        config: expired,
        now: new Date("2026-05-31T00:00:00.000Z")
      })
    ).toThrow("ELEVENLABS_API_KEY_EXPIRES_AT has expired");

    const expiringSoon = await resolveTranscriptionConfig({
      env: {
        ELEVENLABS_API_KEY: "eleven-key",
        ELEVENLABS_API_KEY_EXPIRES_AT: "2026-06-15T00:00:00.000Z",
        ELEVENLABS_STT_MODEL: "scribe_v2"
      },
      homeDir: "/missing-home",
      projectRoot: "/missing-project"
    });

    expect(
      validateTranscriptionJobConfig({
        request: {
          inputPaths: ["/tmp/a.m4a"],
          providerId: "elevenlabs",
          confirmExternalUpload: true
        },
        config: expiringSoon,
        now: new Date("2026-05-31T00:00:00.000Z")
      }).warnings
    ).toContainEqual(
      expect.objectContaining({
        code: "credential-expiring-soon",
        providerId: "elevenlabs"
      })
    );
  });

  it("fails strict diarization requests when a provider cannot support them", async () => {
    const config = await resolveTranscriptionConfig({
      env: {
        TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE: "en-US",
        TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH: "/usr/local/bin/apple-transcriber"
      },
      homeDir: "/missing-home",
      projectRoot: "/missing-project"
    });

    expect(() =>
      validateTranscriptionJobConfig({
        request: {
          inputPaths: ["/tmp/a.m4a"],
          providerId: "apple-local",
          diarize: true,
          failOnCapabilityGap: true
        },
        config
      })
    ).toThrow("Transcription provider apple-local has unsupported speakerDiarization capability");
  });

  it("uses project .env values above shell environment values", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, ".env"), "TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER=apple-local\n", "utf8");

    try {
      const config = await resolveTranscriptionConfig({
        env: {
          TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER: "soniox"
        },
        homeDir: "/missing-home",
        projectRoot: dir
      });

      expect(config.defaultProviderId).toBe("apple-local");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
