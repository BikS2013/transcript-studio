import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { promisify } from "node:util";

import { FFPROBE_EXECUTABLE } from "../config/prerequisites.js";
import type { AudioTrack, ProbeResult } from "../../shared/types.js";

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bit_rate?: string;
  duration?: string;
  tags?: Record<string, unknown>;
}

interface FfprobeFormat {
  duration?: string;
  bit_rate?: string;
  tags?: Record<string, unknown>;
}

interface FfprobeJson {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export async function probeAudioFile(path: string): Promise<ProbeResult> {
  try {
    const { stdout } = await execFileAsync(
      FFPROBE_EXECUTABLE,
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        path
      ],
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024
      }
    );
    return {
      path,
      track: audioTrackFromProbe(path, JSON.parse(stdout) as FfprobeJson)
    };
  } catch (error) {
    return {
      path,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function audioTrackFromProbe(path: string, metadata: FfprobeJson): AudioTrack {
  const audioStream = metadata.streams?.find((stream) => stream.codec_type === "audio");
  if (audioStream === undefined) {
    throw new Error(`No audio stream found in ${path}`);
  }

  const fileName = basename(path);
  const durationSec = parseNumber(audioStream.duration) ?? parseNumber(metadata.format?.duration) ?? 0;
  const bitRate = parseInteger(audioStream.bit_rate) ?? parseInteger(metadata.format?.bit_rate);
  const sampleRate = parseInteger(audioStream.sample_rate);
  const tags = normalizeTags(metadata.format?.tags, audioStream.tags);

  return {
    id: stableTrackId(path),
    path,
    fileName,
    displayName: tags.title ?? fileName,
    durationSec,
    ...(audioStream.codec_name === undefined ? {} : { codec: audioStream.codec_name }),
    ...(sampleRate === undefined ? {} : { sampleRate }),
    ...(audioStream.channels === undefined ? {} : { channels: audioStream.channels }),
    ...(audioStream.channel_layout === undefined ? {} : { channelLayout: audioStream.channel_layout }),
    ...(bitRate === undefined ? {} : { bitRate }),
    tags,
    selected: true,
    muted: false,
    solo: false,
    offsetMs: 0,
    status: "ready",
    derivedOutputIds: []
  };
}

function stableTrackId(path: string): string {
  return `track-${createHash("sha256").update(path).digest("base64url").slice(0, 24)}`;
}

function normalizeTags(...tagSets: Array<Record<string, unknown> | undefined>): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const tagSet of tagSets) {
    if (tagSet === undefined) {
      continue;
    }
    for (const [key, value] of Object.entries(tagSet)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        tags[key] = String(value);
      }
    }
  }
  return tags;
}

function parseInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
