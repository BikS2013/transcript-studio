import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { HealthStatus, PrerequisiteStatus } from "../../shared/types.js";

const execFileAsync = promisify(execFile);

export const FFMPEG_EXECUTABLE = "ffmpeg";
export const FFPROBE_EXECUTABLE = "ffprobe";

export class MissingPrerequisiteError extends Error {
  constructor(public readonly status: PrerequisiteStatus) {
    super(`${status.executable} is required but was not available: ${status.error ?? "unknown error"}`);
    this.name = "MissingPrerequisiteError";
  }
}

export async function checkPrerequisite(executable: string): Promise<PrerequisiteStatus> {
  try {
    const { stdout, stderr } = await execFileAsync(executable, ["-version"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    });
    const firstLine = firstNonEmptyLine(stdout) ?? firstNonEmptyLine(stderr);
    return {
      executable,
      ok: true,
      ...(firstLine === undefined ? {} : { versionLine: firstLine })
    };
  } catch (error) {
    return {
      executable,
      ok: false,
      error: errorMessage(error)
    };
  }
}

export async function checkPrerequisites(): Promise<HealthStatus> {
  const [ffmpeg, ffprobe] = await Promise.all([
    checkPrerequisite(FFMPEG_EXECUTABLE),
    checkPrerequisite(FFPROBE_EXECUTABLE)
  ]);
  return {
    ok: ffmpeg.ok && ffprobe.ok,
    ffmpeg,
    ffprobe
  };
}

export async function requirePrerequisite(executable: string): Promise<PrerequisiteStatus> {
  const status = await checkPrerequisite(executable);
  if (!status.ok) {
    throw new MissingPrerequisiteError(status);
  }
  return status;
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
