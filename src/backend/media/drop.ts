import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { COMMAND_NAME } from "../../shared/app.js";
import type { DroppedMediaResult, DroppedTranscriptResult, StagedLocalFileResult } from "../../shared/types.js";

const DROP_MEDIA_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const DROP_TRANSCRIPT_MAX_BYTES = 100 * 1024 * 1024;

export async function stageDroppedM4a(input: {
  fileName: string;
  source: NodeJS.ReadableStream;
  rootDir?: string;
  maxBytes?: number;
}): Promise<DroppedMediaResult> {
  return stageDroppedFile({
    ...input,
    allowedExtension: ".m4a",
    defaultRootDir: resolve(process.cwd(), `.${COMMAND_NAME}`, "dropped-media"),
    defaultBaseName: "dropped-audio",
    typeLabel: "M4A",
    maxBytes: input.maxBytes ?? DROP_MEDIA_MAX_BYTES
  });
}

export async function stageDroppedTranscript(input: {
  fileName: string;
  source: NodeJS.ReadableStream;
  rootDir?: string;
  maxBytes?: number;
}): Promise<DroppedTranscriptResult> {
  return stageDroppedFile({
    ...input,
    allowedExtension: ".jsonl",
    defaultRootDir: resolve(process.cwd(), `.${COMMAND_NAME}`, "dropped-transcripts"),
    defaultBaseName: "dropped-transcript",
    typeLabel: "JSONL transcript",
    maxBytes: input.maxBytes ?? DROP_TRANSCRIPT_MAX_BYTES
  });
}

async function stageDroppedFile(input: {
  fileName: string;
  source: NodeJS.ReadableStream;
  allowedExtension: ".m4a" | ".jsonl";
  defaultRootDir: string;
  defaultBaseName: string;
  typeLabel: string;
  rootDir?: string;
  maxBytes: number;
}): Promise<StagedLocalFileResult> {
  const originalFileName = cleanOriginalFileName(input.fileName);
  if (extname(originalFileName).toLowerCase() !== input.allowedExtension) {
    const article = input.typeLabel === "M4A" ? "an" : "a";
    throw new Error(`Dropped file must be ${article} ${input.typeLabel} file: ${originalFileName}`);
  }

  const rootDir = resolve(input.rootDir ?? input.defaultRootDir);
  await mkdir(rootDir, { recursive: true });

  const tempPath = resolve(rootDir, `.upload-${randomUUID()}.tmp`);
  const hash = createHash("sha256");
  let sizeBytes = 0;

  const hashAndLimit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      sizeBytes += chunk.byteLength;
      if (sizeBytes > input.maxBytes) {
        callback(new Error(`Dropped ${input.typeLabel} exceeds the ${input.maxBytes} byte size limit.`));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    }
  });

  try {
    await pipeline(input.source, hashAndLimit, createWriteStream(tempPath, { flags: "wx" }));
  } catch (error) {
    await removeIfExists(tempPath);
    throw error;
  }

  const digest = hash.digest("hex");
  const stagedFileName = `${safeNameWithoutExtension(originalFileName, input.defaultBaseName)}-${digest.slice(0, 16)}${input.allowedExtension}`;
  const finalPath = resolve(rootDir, stagedFileName);
  if (!finalPath.startsWith(`${rootDir}/`)) {
    await removeIfExists(tempPath);
    throw new Error("Resolved dropped file path escaped the staging directory.");
  }

  if (await fileExists(finalPath)) {
    await removeIfExists(tempPath);
  } else {
    await rename(tempPath, finalPath);
  }

  return {
    originalFileName,
    stagedFileName,
    path: finalPath,
    sizeBytes,
    sha256: digest
  };
}

function cleanOriginalFileName(fileName: string): string {
  const cleaned = basename(fileName.trim());
  if (cleaned.length === 0) {
    throw new Error("Dropped file name is required.");
  }
  return cleaned;
}

function safeNameWithoutExtension(fileName: string, defaultBaseName: string): string {
  const extension = extname(fileName);
  const base = fileName.slice(0, fileName.length - extension.length);
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe.length > 0 ? safe : defaultBaseName;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function removeIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) {
      throw error;
    }
  }
}
