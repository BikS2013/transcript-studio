import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  addDerivedOutput,
  createDerivedOutput,
  createSessionManifest,
  saveSessionManifest
} from "../../src/backend/session/manifest.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "transcript-studio-"));
}

describe("session manifest persistence", () => {
  it("saves manifests through the collision guard and touches the update timestamp", async () => {
    const dir = await createTempDir();
    const manifestPath = join(dir, "session.json");
    const manifest = createSessionManifest({
      nowIso: "2024-01-01T00:00:00.000Z",
      tracks: [],
      derivedOutputs: []
    });

    try {
      const saved = await saveSessionManifest(manifestPath, manifest);
      const written = JSON.parse(await readFile(manifestPath, "utf8")) as typeof saved;

      expect(saved).toMatchObject({
        version: "transcript-studio/v1",
        createdAtIso: "2024-01-01T00:00:00.000Z",
        tracks: [],
        derivedOutputs: []
      });
      expect(saved.updatedAtIso).not.toBe(manifest.updatedAtIso);
      expect(written).toEqual(saved);

      await expect(
        saveSessionManifest(manifestPath, manifest)
      ).rejects.toThrow(`Refusing to overwrite existing output: ${manifestPath}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("derives output metadata from disk and links the output back to source tracks", async () => {
    const dir = await createTempDir();
    const derivedPath = join(dir, "export.html");
    await writeFile(derivedPath, "<html>export</html>", "utf8");

    try {
      const derived = await createDerivedOutput({
        kind: "transcript-html",
        path: derivedPath,
        sourcePaths: ["/tracks/session-a.m4a"],
        createdAtIso: "2024-02-02T10:00:00.000Z"
      });

      expect(derived).toMatchObject({
        kind: "transcript-html",
        path: derivedPath,
        createdAtIso: "2024-02-02T10:00:00.000Z",
        sourcePaths: ["/tracks/session-a.m4a"],
        sizeBytes: 19
      });
      expect(derived.id).toMatch(/^derived-/);

      const manifest = createSessionManifest({
        nowIso: "2024-02-02T10:00:00.000Z",
        tracks: [
          {
            id: "track-a",
            path: "/tracks/session-a.m4a",
            fileName: "session-a.m4a",
            displayName: "Session A",
            durationSec: 12,
            tags: {},
            selected: true,
            muted: false,
            solo: false,
            offsetMs: 0,
            status: "ready",
            derivedOutputIds: []
          },
          {
            id: "track-b",
            path: "/tracks/session-b.m4a",
            fileName: "session-b.m4a",
            displayName: "Session B",
            durationSec: 8,
            tags: {},
            selected: true,
            muted: false,
            solo: false,
            offsetMs: 0,
            status: "ready",
            derivedOutputIds: []
          }
        ]
      });

      const updated = addDerivedOutput(manifest, derived);

      expect(updated.derivedOutputs).toEqual([derived]);
      expect(updated.tracks[0]).toMatchObject({
        id: "track-a",
        derivedOutputIds: [derived.id]
      });
      expect(updated.tracks[1]).toMatchObject({
        id: "track-b",
        derivedOutputIds: []
      });
      expect(updated.updatedAtIso).not.toBe(manifest.updatedAtIso);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
