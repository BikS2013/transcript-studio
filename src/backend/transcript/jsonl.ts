import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

import { assertOutputDoesNotExist } from "../ffmpeg/commands.js";
import { PRODUCT_NAME } from "../../shared/app.js";
import { formatTimestamp, isoDeltaMs, parseTimestampToMs, secondsToMs } from "../../shared/time/format.js";
import type {
  TranscriptAnnotation,
  TranscriptBundle,
  TranscriptParagraph,
  TranscriptParseError,
  TranscriptSegment,
  TranscriptSource
} from "../../shared/types.js";

interface LoadTranscriptOptions {
  anchorIso?: string;
}

interface PendingSegment extends Omit<TranscriptSegment, "startMs"> {
  explicitStartMs?: number;
}

interface PendingAnnotation extends Omit<TranscriptAnnotation, "startMs"> {
  explicitStartMs?: number;
}

export async function loadJsonlTranscripts(
  paths: string[],
  options: LoadTranscriptOptions = {}
): Promise<TranscriptBundle> {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error("At least one transcript path is required");
  }

  const sources: TranscriptSource[] = [];
  const pendingSegments: PendingSegment[] = [];
  const pendingAnnotations: PendingAnnotation[] = [];

  for (const path of paths) {
    const parsed = parseJsonlTranscript(path, await readFile(path, "utf8"));
    sources.push(parsed.source);
    pendingSegments.push(...parsed.segments);
    pendingAnnotations.push(...parsed.annotations);
  }

  const anchorIso = options.anchorIso ?? earliestIso(pendingSegments, pendingAnnotations);
  const segments = pendingSegments.map((segment) => materializeSegment(segment, anchorIso));
  const annotations = pendingAnnotations.map((annotation) => materializeAnnotation(annotation, anchorIso));
  segments.sort((a, b) => a.startMs - b.startMs || a.sourcePath.localeCompare(b.sourcePath) || a.lineNumber - b.lineNumber);

  return {
    id: `bundle-${Date.now().toString(36)}`,
    ...(anchorIso === undefined ? {} : { anchorIso }),
    sources,
    segments,
    annotations,
    paragraphs: groupTranscriptSegments(segments)
  };
}

export function parseJsonlTranscript(path: string, contents: string): {
  source: TranscriptSource;
  segments: PendingSegment[];
  annotations: PendingAnnotation[];
} {
  const sourceId = `source-${Buffer.from(path).toString("base64url").slice(0, 32)}`;
  const errors: TranscriptParseError[] = [];
  const segments: PendingSegment[] = [];
  const annotations: PendingAnnotation[] = [];
  let recordCount = 0;

  const lines = contents.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.trim().length === 0) {
      return;
    }
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch (error) {
      errors.push({
        path,
        lineNumber,
        message: `Malformed JSON: ${error instanceof Error ? error.message : String(error)}`,
        rawLine: line
      });
      return;
    }
    recordCount += 1;
    if (!isRecord(record)) {
      errors.push({
        path,
        lineNumber,
        message: "JSONL record must be an object",
        rawLine: line
      });
      return;
    }

    try {
      const classification = classifyRecord(record);
      if (classification === "segment") {
        segments.push(normalizeSegment(record, sourceId, path, lineNumber));
        return;
      }
      annotations.push(normalizeAnnotation(record, sourceId, path, lineNumber));
    } catch (error) {
      errors.push({
        path,
        lineNumber,
        message: error instanceof Error ? error.message : String(error),
        rawLine: line
      });
    }
  });

  return {
    source: {
      id: sourceId,
      path,
      fileName: basename(path),
      recordCount,
      segmentCount: segments.length,
      annotationCount: annotations.length,
      errors
    },
    segments,
    annotations
  };
}

export function classifyRecord(record: Record<string, unknown>): "segment" | "annotation" {
  const text = stringField(record, "text");
  const hasTranscriptTiming =
    hasAnyField(record, ["timestamp", "startMs", "startSec", "offsetMs", "recordingTimestampMs"]) ||
    typeof record.durationSec === "number";
  const hasTranscriptIdentity = hasAnyField(record, ["speaker", "source", "model", "language"]);
  const looksLikeSidecar = hasAnyField(record, ["question", "answer", "annotation", "notes", "summary"]);
  return text !== undefined && (hasTranscriptTiming || hasTranscriptIdentity) && !looksLikeSidecar
    ? "segment"
    : "annotation";
}

export function groupTranscriptSegments(segments: TranscriptSegment[]): TranscriptParagraph[] {
  const paragraphs: TranscriptParagraph[] = [];
  let current: TranscriptSegment[] = [];

  for (const segment of segments) {
    const previous = current.at(-1);
    const startsNew =
      previous === undefined ||
      previous.speaker !== segment.speaker ||
      previous.source !== segment.source ||
      previous.language !== segment.language ||
      segment.startMs - segmentEndMs(previous) > 3_000;

    if (startsNew && current.length > 0) {
      paragraphs.push(paragraphFromSegments(current));
      current = [];
    }
    current.push(segment);
  }
  if (current.length > 0) {
    paragraphs.push(paragraphFromSegments(current));
  }
  return paragraphs;
}

export function exportTranscriptHtml(bundle: TranscriptBundle, title = `${PRODUCT_NAME} Export`): string {
  const rows = bundle.paragraphs
    .map((paragraph) => {
      const meta = [paragraph.speaker, paragraph.source, paragraph.language].filter(Boolean).join(" / ");
      return `<article class="paragraph" data-start-ms="${paragraph.startMs}">
  <time>${escapeHtml(formatTimestamp(paragraph.startMs, { milliseconds: true }))}</time>
  ${meta.length > 0 ? `<strong>${escapeHtml(meta)}</strong>` : ""}
  <p>${escapeHtml(paragraph.text)}</p>
</article>`;
    })
    .join("\n");
  const annotations =
    bundle.annotations.length === 0
      ? ""
      : `<section class="annotations">
  <h2>Annotations</h2>
  ${bundle.annotations
    .map((annotation) => `<p>${escapeHtml(annotation.text)}${annotation.wallTimeIso === undefined ? "" : ` <time>${escapeHtml(annotation.wallTimeIso)}</time>`}</p>`)
    .join("\n  ")}
</section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #202124; }
    header { border-bottom: 1px solid #dadce0; margin-bottom: 1.5rem; }
    .paragraph { border-bottom: 1px solid #eee; padding: 0.75rem 0; }
    time { color: #5f6368; font-variant-numeric: tabular-nums; margin-right: 0.75rem; }
    strong { color: #174ea6; }
    p { margin: 0.4rem 0 0; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p>${bundle.segments.length} transcript segments from ${bundle.sources.length} source file(s).</p>
  </header>
  <main>
${rows}
${annotations}
  </main>
</body>
</html>
`;
}

export async function writeTranscriptHtml(
  outputPath: string,
  bundle: TranscriptBundle,
  title?: string
): Promise<{ outputPath: string; html: string }> {
  await assertOutputDoesNotExist(outputPath);
  const html = exportTranscriptHtml(bundle, title);
  await writeFile(outputPath, html, "utf8");
  return { outputPath, html };
}

function normalizeSegment(
  record: Record<string, unknown>,
  sourceId: string,
  sourcePath: string,
  lineNumber: number
): PendingSegment {
  const text = stringField(record, "text") ?? "";
  const timing = extractTiming(record);
  return {
    id: stringField(record, "id") ?? `${sourceId}-line-${lineNumber}`,
    sourceId,
    sourcePath,
    lineNumber,
    text,
    ...(stringField(record, "speaker") === undefined ? {} : { speaker: stringField(record, "speaker") as string }),
    ...(stringField(record, "source") === undefined ? {} : { source: stringField(record, "source") as string }),
    ...(stringField(record, "model") === undefined ? {} : { model: stringField(record, "model") as string }),
    ...(stringField(record, "language") === undefined ? {} : { language: stringField(record, "language") as string }),
    ...(numberField(record, "confidence") === undefined ? {} : { confidence: numberField(record, "confidence") as number }),
    ...(transcriptionProviderField(record, "provider") === undefined
      ? {}
      : { provider: transcriptionProviderField(record, "provider") as "soniox" | "apple-local" | "elevenlabs" }),
    ...(stringField(record, "providerResultRef") === undefined ? {} : { providerResultRef: stringField(record, "providerResultRef") as string }),
    ...(timing.wallTimeIso === undefined ? {} : { wallTimeIso: timing.wallTimeIso }),
    ...(timing.explicitStartMs === undefined ? {} : { explicitStartMs: timing.explicitStartMs }),
    ...(numberField(record, "durationSec") === undefined ? {} : { durationMs: secondsToMs(numberField(record, "durationSec") as number) }),
    raw: record
  };
}

function normalizeAnnotation(
  record: Record<string, unknown>,
  sourceId: string,
  sourcePath: string,
  lineNumber: number
): PendingAnnotation {
  const timing = extractTiming(record);
  return {
    id: stringField(record, "id") ?? `${sourceId}-annotation-${lineNumber}`,
    sourceId,
    sourcePath,
    lineNumber,
    text: annotationText(record),
    ...(timing.wallTimeIso === undefined ? {} : { wallTimeIso: timing.wallTimeIso }),
    ...(timing.explicitStartMs === undefined ? {} : { explicitStartMs: timing.explicitStartMs }),
    raw: record
  };
}

function materializeSegment(segment: PendingSegment, anchorIso: string | undefined): TranscriptSegment {
  const startMs = segment.explicitStartMs ?? (segment.wallTimeIso !== undefined && anchorIso !== undefined ? isoDeltaMs(segment.wallTimeIso, anchorIso) : 0);
  const { explicitStartMs: _explicitStartMs, ...rest } = segment;
  return { ...rest, startMs };
}

function materializeAnnotation(
  annotation: PendingAnnotation,
  anchorIso: string | undefined
): TranscriptAnnotation {
  const startMs = annotation.explicitStartMs ?? (annotation.wallTimeIso !== undefined && anchorIso !== undefined ? isoDeltaMs(annotation.wallTimeIso, anchorIso) : undefined);
  const { explicitStartMs: _explicitStartMs, ...rest } = annotation;
  return startMs === undefined ? rest : { ...rest, startMs };
}

function extractTiming(record: Record<string, unknown>): { explicitStartMs?: number; wallTimeIso?: string } {
  const explicitMs =
    numberField(record, "recordingTimestampMs") ??
    numberField(record, "startMs") ??
    numberField(record, "offsetMs") ??
    (numberField(record, "startSec") === undefined ? undefined : secondsToMs(numberField(record, "startSec") as number));
  if (explicitMs !== undefined) {
    return { explicitStartMs: Math.max(0, Math.round(explicitMs)) };
  }

  const timestamp = record.timestamp;
  if (typeof timestamp === "number") {
    return { explicitStartMs: secondsToMs(timestamp) };
  }
  if (typeof timestamp === "string" && timestamp.trim().length > 0) {
    const trimmed = timestamp.trim();
    if (isIsoTimestamp(trimmed)) {
      return { wallTimeIso: new Date(trimmed).toISOString() };
    }
    return { explicitStartMs: parseTimestampToMs(trimmed) };
  }
  return {};
}

function paragraphFromSegments(segments: TranscriptSegment[]): TranscriptParagraph {
  const first = segments[0] as TranscriptSegment;
  const last = segments.at(-1) as TranscriptSegment;
  return {
    id: `paragraph-${first.id}`,
    startMs: first.startMs,
    endMs: segmentEndMs(last),
    ...(first.speaker === undefined ? {} : { speaker: first.speaker }),
    ...(first.source === undefined ? {} : { source: first.source }),
    ...(first.language === undefined ? {} : { language: first.language }),
    segmentIds: segments.map((segment) => segment.id),
    text: segments.map((segment) => segment.text).join(" ")
  };
}

function segmentEndMs(segment: TranscriptSegment): number {
  return segment.startMs + (segment.durationMs ?? 0);
}

function annotationText(record: Record<string, unknown>): string {
  return (
    stringField(record, "text") ??
    stringField(record, "answer") ??
    stringField(record, "question") ??
    stringField(record, "annotation") ??
    stringField(record, "notes") ??
    JSON.stringify(record)
  );
}

function earliestIso(segments: PendingSegment[], annotations: PendingAnnotation[]): string | undefined {
  const timestamps = [...segments, ...annotations]
    .map((item) => item.wallTimeIso)
    .filter((value): value is string => value !== undefined)
    .sort();
  return timestamps[0];
}

function hasAnyField(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => record[key] !== undefined);
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function transcriptionProviderField(
  record: Record<string, unknown>,
  key: string
): "soniox" | "apple-local" | "elevenlabs" | undefined {
  const value = stringField(record, key);
  return value === "soniox" || value === "apple-local" || value === "elevenlabs" ? value : undefined;
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value)) && /T/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
