export type TrackStatus = "idle" | "probing" | "ready" | "playing" | "paused" | "error";

export interface AudioTrack {
  id: string;
  path: string;
  fileName: string;
  displayName: string;
  durationSec: number;
  codec?: string;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
  bitRate?: number;
  tags: Record<string, string>;
  selected: boolean;
  muted: boolean;
  solo: boolean;
  offsetMs: number;
  status: TrackStatus;
  derivedOutputIds: string[];
  error?: string;
}

export interface ProbeResult {
  path: string;
  track?: AudioTrack;
  error?: string;
}

export interface StagedLocalFileResult {
  originalFileName: string;
  stagedFileName: string;
  path: string;
  sizeBytes: number;
  sha256: string;
}

export type DroppedMediaResult = StagedLocalFileResult;

export type DroppedTranscriptResult = StagedLocalFileResult;

export interface TranscriptSource {
  id: string;
  path: string;
  fileName: string;
  recordCount: number;
  segmentCount: number;
  annotationCount: number;
  errors: TranscriptParseError[];
}

export interface TranscriptParseError {
  path: string;
  lineNumber: number;
  message: string;
  rawLine: string;
}

export interface TranscriptSegment {
  id: string;
  sourceId: string;
  sourcePath: string;
  lineNumber: number;
  text: string;
  speaker?: string;
  source?: string;
  model?: string;
  language?: string;
  wallTimeIso?: string;
  startMs: number;
  durationMs?: number;
  raw: unknown;
}

export interface TranscriptAnnotation {
  id: string;
  sourceId: string;
  sourcePath: string;
  lineNumber: number;
  text: string;
  startMs?: number;
  wallTimeIso?: string;
  raw: unknown;
}

export interface TranscriptParagraph {
  id: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  source?: string;
  language?: string;
  segmentIds: string[];
  text: string;
}

export interface TranscriptBundle {
  id: string;
  anchorIso?: string;
  sources: TranscriptSource[];
  segments: TranscriptSegment[];
  annotations: TranscriptAnnotation[];
  paragraphs: TranscriptParagraph[];
}

export type ProcessingKind = "mix" | "source-separated" | "denoise" | "loudness";

export interface ProcessingPlanRequest {
  kind: ProcessingKind;
  inputPaths: string[];
  outputPath: string;
  denoisePreset?: "conservative";
  loudnessTarget?: string;
}

export interface ProcessCommand {
  executable: string;
  args: string[];
}

export interface ProcessingPlan {
  kind: ProcessingKind;
  command: ProcessCommand;
  outputPath: string;
  warnings: string[];
}

export interface ProcessingRunResult {
  plan: ProcessingPlan;
  exitCode: number;
  outputPath: string;
  sizeBytes: number;
  stdout: string;
  stderr: string;
  validation: {
    exists: boolean;
    nonEmpty: boolean;
  };
}

export interface DerivedOutput {
  id: string;
  kind: ProcessingKind | "transcript-html";
  path: string;
  createdAtIso: string;
  sourcePaths: string[];
  sizeBytes?: number;
}

export interface SessionManifest {
  version: "transcript-studio/v1";
  createdAtIso: string;
  updatedAtIso: string;
  tracks: AudioTrack[];
  transcriptBundle?: TranscriptBundle;
  derivedOutputs: DerivedOutput[];
}

export interface HealthStatus {
  ok: boolean;
  ffmpeg: PrerequisiteStatus;
  ffprobe: PrerequisiteStatus;
}

export interface PrerequisiteStatus {
  executable: string;
  ok: boolean;
  versionLine?: string;
  error?: string;
}
