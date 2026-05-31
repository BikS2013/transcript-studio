import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { startServer, type StartedServer } from "../../src/backend/server/index.js";
import type { TranscriptionPlan, TranscriptionProvidersResponse } from "../../src/shared/types.js";

const ENV_KEYS = [
  "HOME",
  "TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER",
  "SONIOX_API_KEY",
  "SONIOX_API_KEY_EXPIRES_AT",
  "SONIOX_STT_MODEL",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_API_KEY_EXPIRES_AT",
  "ELEVENLABS_STT_MODEL",
  "TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE"
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

async function startTestServer(): Promise<{ server: StartedServer; baseUrl: string }> {
  const server = startServer({ port: 0, log: false });
  await server.ready;
  const address = server.server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

describe("transcription backend endpoints", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      const original = originalEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it("returns provider capabilities and default-provider configuration status", async () => {
    process.env.TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER = "apple-local";

    const { server, baseUrl } = await startTestServer();
    try {
      const response = await fetch(`${baseUrl}/api/transcription/providers`);
      const payload = (await response.json()) as TranscriptionProvidersResponse;

      expect(response.status).toBe(200);
      expect(payload.defaultProviderId).toBe("apple-local");
      expect(payload.providers.map((provider) => provider.id)).toEqual(["soniox", "apple-local", "elevenlabs"]);
    } finally {
      await server.close();
    }
  });

  it("plans transcription outputs after validating provider config and consent", async () => {
    const dir = await createTempDir();
    const inputPath = join(dir, "meeting.m4a");
    await writeFile(inputPath, "audio", "utf8");
    process.env.HOME = dir;
    process.env.SONIOX_API_KEY = "soniox-key";
    process.env.SONIOX_API_KEY_EXPIRES_AT = "2030-01-01T00:00:00.000Z";
    process.env.SONIOX_STT_MODEL = "stt-async-v3";

    const { server, baseUrl } = await startTestServer();
    try {
      const response = await fetch(`${baseUrl}/api/transcription/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputPaths: [inputPath],
          providerId: "soniox",
          confirmExternalUpload: true,
          languageHints: ["en"]
        })
      });
      const payload = (await response.json()) as TranscriptionPlan;

      expect(response.status).toBe(200);
      expect(payload.provider.id).toBe("soniox");
      expect(payload.model).toBe("stt-async-v3");
      expect(payload.languageHints).toEqual(["en"]);
      expect(payload.outputs[0]?.canonicalJsonlPath).toMatch(/meeting\.transcript-studio\.soniox\.\d{8}T\d{6}Z\.jsonl$/);
      expect(payload.outputs[0]?.providerJsonPath).toMatch(/meeting\.transcript-studio\.soniox\.\d{8}T\d{6}Z\.provider\.json$/);
    } finally {
      await server.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
