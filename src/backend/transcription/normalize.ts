import { basename } from "node:path";

import type { TranscriptionProviderId } from "../../shared/types.js";

export interface CanonicalTranscriptionSegment {
  id: string;
  text: string;
  startMs: number;
  durationSec?: number;
  speaker?: string;
  source: string;
  model?: string;
  language?: string;
  confidence?: number;
  provider: TranscriptionProviderId;
  providerResultRef: string;
  raw?: unknown;
}

interface WordLike {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  language?: string;
  confidence?: number;
  raw: unknown;
}

const SEGMENT_GAP_MS = 2_500;

export function writeCanonicalJsonl(segments: CanonicalTranscriptionSegment[]): string {
  return `${segments.map((segment) => JSON.stringify(segment)).join("\n")}\n`;
}

export function normalizeSonioxTranscript(input: {
  transcript: unknown;
  providerResultPath: string;
  model?: string;
}): CanonicalTranscriptionSegment[] {
  const tokens = extractSonioxTokens(input.transcript);
  return groupWords(tokens, {
    provider: "soniox",
    source: "transcription:soniox",
    providerResultRef: basename(input.providerResultPath),
    ...(input.model === undefined ? {} : { model: input.model })
  });
}

export function normalizeElevenLabsTranscript(input: {
  transcript: unknown;
  providerResultPath: string;
  model?: string;
}): CanonicalTranscriptionSegment[] {
  const words = extractElevenLabsWords(input.transcript);
  return groupWords(words, {
    provider: "elevenlabs",
    source: "transcription:elevenlabs",
    providerResultRef: basename(input.providerResultPath),
    ...(input.model === undefined ? {} : { model: input.model })
  });
}

export function normalizeAppleLocalTranscript(input: {
  transcript: unknown;
  providerResultPath: string;
  locale: string;
}): CanonicalTranscriptionSegment[] {
  const segments = recordArray(input.transcript, "segments")
    .concat(recordArray(input.transcript, "results"))
    .concat(recordArray(input.transcript, "transcripts"));
  return segments
    .map((segment, index): CanonicalTranscriptionSegment | undefined => {
      const text = stringField(segment, "text") ?? stringField(segment, "transcript") ?? stringField(segment, "formattedString");
      if (text === undefined || text.trim().length === 0) {
        return undefined;
      }
      const startMs = millisField(segment, "startMs") ?? secondsField(segment, "startSec") ?? secondsField(segment, "start");
      const endMs = millisField(segment, "endMs") ?? secondsField(segment, "endSec") ?? secondsField(segment, "end");
      const durationMs =
        millisField(segment, "durationMs") ??
        secondsField(segment, "durationSec") ??
        (startMs !== undefined && endMs !== undefined ? endMs - startMs : undefined);
      return {
        id: `apple-local-segment-${String(index + 1).padStart(6, "0")}`,
        text: text.trim(),
        startMs: Math.max(0, Math.round(startMs ?? 0)),
        ...(durationMs === undefined ? {} : { durationSec: Math.max(0, durationMs) / 1000 }),
        source: "transcription:apple-local",
        language: input.locale,
        ...(numberField(segment, "confidence") === undefined ? {} : { confidence: numberField(segment, "confidence") as number }),
        provider: "apple-local",
        providerResultRef: basename(input.providerResultPath),
        raw: segment
      };
    })
    .filter((segment): segment is CanonicalTranscriptionSegment => segment !== undefined);
}

function groupWords(
  words: WordLike[],
  context: {
    provider: TranscriptionProviderId;
    source: string;
    providerResultRef: string;
    model?: string;
  }
): CanonicalTranscriptionSegment[] {
  const segments: WordLike[][] = [];
  let current: WordLike[] = [];
  for (const word of words.filter((candidate) => candidate.text.trim().length > 0)) {
    const previous = current.at(-1);
    const startsNew =
      previous === undefined ||
      previous.speaker !== word.speaker ||
      previous.language !== word.language ||
      word.startMs - previous.endMs > SEGMENT_GAP_MS ||
      endsSentence(previous.text);
    if (startsNew && current.length > 0) {
      segments.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length > 0) {
    segments.push(current);
  }

  return segments.map((segment, index) => {
    const first = segment[0] as WordLike;
    const last = segment.at(-1) as WordLike;
    const confidences = segment
      .map((word) => word.confidence)
      .filter((confidence): confidence is number => typeof confidence === "number" && Number.isFinite(confidence));
    const confidence =
      confidences.length === 0
        ? undefined
        : confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
    return {
      id: `${context.provider}-segment-${String(index + 1).padStart(6, "0")}`,
      text: joinWords(segment.map((word) => word.text)),
      startMs: first.startMs,
      durationSec: Math.max(0, last.endMs - first.startMs) / 1000,
      ...(first.speaker === undefined ? {} : { speaker: first.speaker }),
      source: context.source,
      ...(context.model === undefined ? {} : { model: context.model }),
      ...(first.language === undefined ? {} : { language: first.language }),
      ...(confidence === undefined ? {} : { confidence }),
      provider: context.provider,
      providerResultRef: context.providerResultRef,
      raw: {
        wordCount: segment.length
      }
    };
  });
}

function extractSonioxTokens(transcript: unknown): WordLike[] {
  const records = recordArray(transcript, "tokens")
    .concat(recordArray(transcript, "words"))
    .concat(recordArray(transcript, "items"));
  return records
    .map((token): WordLike | undefined => {
      const text = tokenTextField(token, "text") ?? tokenTextField(token, "word");
      const startMs = millisField(token, "start_ms") ?? millisField(token, "startMs") ?? secondsField(token, "start");
      const endMs = millisField(token, "end_ms") ?? millisField(token, "endMs") ?? secondsField(token, "end");
      if (text === undefined || startMs === undefined || endMs === undefined) {
        return undefined;
      }
      return {
        text,
        startMs,
        endMs,
        ...(stringField(token, "speaker") === undefined ? {} : { speaker: stringField(token, "speaker") as string }),
        ...(stringField(token, "language") === undefined ? {} : { language: stringField(token, "language") as string }),
        ...(numberField(token, "confidence") === undefined ? {} : { confidence: numberField(token, "confidence") as number }),
        raw: token
      };
    })
    .filter((word): word is WordLike => word !== undefined);
}

function extractElevenLabsWords(transcript: unknown): WordLike[] {
  const records = recordArray(transcript, "words");
  return records
    .map((word): WordLike | undefined => {
      const text = stringField(word, "text") ?? stringField(word, "word");
      const startMs = secondsField(word, "start") ?? millisField(word, "start_ms") ?? millisField(word, "startMs");
      const endMs = secondsField(word, "end") ?? millisField(word, "end_ms") ?? millisField(word, "endMs");
      if (text === undefined || startMs === undefined || endMs === undefined) {
        return undefined;
      }
      return {
        text,
        startMs,
        endMs,
        ...(stringField(word, "speaker_id") === undefined && stringField(word, "speaker") === undefined
          ? {}
          : { speaker: (stringField(word, "speaker_id") ?? stringField(word, "speaker")) as string }),
        ...(stringField(transcriptRecord(transcript), "language_code") === undefined
          ? {}
          : { language: stringField(transcriptRecord(transcript), "language_code") as string }),
        ...(numberField(word, "confidence") === undefined ? {} : { confidence: numberField(word, "confidence") as number }),
        raw: word
      };
    })
    .filter((word): word is WordLike => word !== undefined);
}

function recordArray(value: unknown, key: string): Record<string, unknown>[] {
  const record = transcriptRecord(value);
  const array = record[key];
  return Array.isArray(array) ? array.filter(isRecord) : [];
}

function transcriptRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function joinWords(words: string[]): string {
  const hasExplicitSpacing = words.some((word) => /^\s/.test(word));
  return (hasExplicitSpacing ? words.join("") : words.join(" "))
    .replace(/\s+([.,!?;:%])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function endsSentence(text: string): boolean {
  return /[.!?]["')\]]?$/.test(text.trim());
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function tokenTextField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function millisField(record: Record<string, unknown>, key: string): number | undefined {
  const value = numberField(record, key);
  return value === undefined ? undefined : Math.max(0, Math.round(value));
}

function secondsField(record: Record<string, unknown>, key: string): number | undefined {
  const value = numberField(record, key);
  return value === undefined ? undefined : Math.max(0, Math.round(value * 1000));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
