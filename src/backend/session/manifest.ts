import { readFile, stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";

import { assertOutputDoesNotExist } from "../ffmpeg/commands.js";
import { SESSION_MANIFEST_VERSION } from "../../shared/app.js";
import type { AudioTrack, DerivedOutput, SessionManifest, TranscriptBundle } from "../../shared/types.js";

export function createSessionManifest(input: {
  tracks?: AudioTrack[];
  transcriptBundle?: TranscriptBundle;
  derivedOutputs?: DerivedOutput[];
  nowIso?: string;
} = {}): SessionManifest {
  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    version: SESSION_MANIFEST_VERSION,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    tracks: input.tracks ?? [],
    ...(input.transcriptBundle === undefined ? {} : { transcriptBundle: input.transcriptBundle }),
    derivedOutputs: input.derivedOutputs ?? []
  };
}

export async function saveSessionManifest(path: string, manifest: SessionManifest): Promise<SessionManifest> {
  await assertOutputDoesNotExist(path);
  const updated = touchManifest(manifest);
  await writeFile(path, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return updated;
}

export async function loadSessionManifest(path: string): Promise<SessionManifest> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return normalizeManifest(parsed, path);
}

export async function createDerivedOutput(input: {
  kind: DerivedOutput["kind"];
  path: string;
  sourcePaths: string[];
  createdAtIso?: string;
}): Promise<DerivedOutput> {
  const sizeBytes = await fileSize(input.path);
  return {
    id: `derived-${Buffer.from(`${input.kind}:${input.path}`).toString("base64url").slice(0, 32)}`,
    kind: input.kind,
    path: input.path,
    createdAtIso: input.createdAtIso ?? new Date().toISOString(),
    sourcePaths: input.sourcePaths,
    ...(sizeBytes === undefined ? {} : { sizeBytes })
  };
}

export function addDerivedOutput(manifest: SessionManifest, output: DerivedOutput): SessionManifest {
  return touchManifest({
    ...manifest,
    derivedOutputs: [...manifest.derivedOutputs, output],
    tracks: manifest.tracks.map((track) =>
      output.sourcePaths.includes(track.path)
        ? { ...track, derivedOutputIds: [...track.derivedOutputIds, output.id] }
        : track
    )
  });
}

function touchManifest(manifest: SessionManifest): SessionManifest {
  return {
    ...manifest,
    updatedAtIso: new Date().toISOString()
  };
}

function normalizeManifest(value: unknown, path: string): SessionManifest {
  if (!isRecord(value)) {
    throw new Error(`Session manifest is not an object: ${path}`);
  }
  if (value.version !== SESSION_MANIFEST_VERSION) {
    throw new Error(`Unsupported session manifest version in ${basename(path)}: ${String(value.version)}`);
  }
  if (!Array.isArray(value.tracks) || !Array.isArray(value.derivedOutputs)) {
    throw new Error(`Invalid session manifest shape: ${path}`);
  }
  return value as unknown as SessionManifest;
}

async function fileSize(path: string): Promise<number | undefined> {
  try {
    const info = await stat(path);
    return info.size;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
