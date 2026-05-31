# JSONL Transcript Navigation

## Overview

This research documents an implementation-level design for ingesting JSONL transcript files and turning them into transcript-driven audio navigation in a TypeScript application.

The design goal is to normalize transcript-like JSONL inputs into one canonical model, derive clean relative times from wall-clock timestamps, group fragments into readable paragraphs, and render an interactive HTML transcript that can seek one or more audio tracks.

The local sample files strongly suggest a two-layer model:

- A main transcript stream with one JSON object per line and fields such as `speaker`, `id`, `durationSec`, `source`, `model`, `text`, `timestamp`, and `language`.
- A sidecar JSONL stream with QA-style records keyed by `recording_basename`, `schema`, `question`, `answer`, `ts_wall`, `ts_recording_ms`, and transcript window bounds.

Primary implementation recommendation:

- Treat JSONL as the source interchange format.
- Normalize into a typed canonical transcript model.
- Render HTML as the primary interactive presentation layer.
- Generate Markdown and PDF as derived exports from the same canonical model.

## Local Sample Evidence

### Main transcript file

Reference: [`recording-2026-05-14-15-59.transcript.jsonl`](/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/sample-inputs/recording-2026-05-14-15-59.transcript.jsonl)

Observed characteristics:

- 135 JSONL records.
- Every line contains the same core field set in some key order: `speaker`, `id`, `durationSec`, `source`, `model`, `text`, `timestamp`, `language`.
- `speaker` values are short labels such as `"1"`, `"2"`, and `"3"`.
- `source` is consistently `"system"` in this sample.
- Timestamps are ISO-8601 wall-clock strings with a trailing `Z`.
- One local ordering anomaly exists around lines 29 to 31: timestamp order is not strictly monotonic, so a stable sort is required before rendering or deriving relative offsets.

Suggested evidence window:

- `recording-2026-05-14-15-59.transcript.jsonl`, lines 1-40, shows the repeated shape.
- `recording-2026-05-14-15-59.transcript.jsonl`, lines 29-31, show the timestamp inversion.

### QA sidecar file

Reference: [`recording-2026-05-14-15-59.m4a.questions.jsonl`](/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/sample-inputs/recording-2026-05-14-15-59.m4a.questions.jsonl)

Observed characteristics:

- 2 JSONL records.
- Schema marker: `qa-sidecar/v1`.
- The first record is metadata (`written_at`, `recording_basename`, `schema`).
- The second record is a question/answer annotation with `question`, `answer`, `ts_wall`, `ts_recording_ms`, `transcript_window_start_ms`, and `transcript_window_end_ms`.
- This file does not behave like a transcript segment stream; it is better treated as an annotation stream that can be attached to a recording bundle.

Suggested evidence window:

- `recording-2026-05-14-15-59.m4a.questions.jsonl`, lines 1-2.

### Existing human-readable transcript artifact

Reference: [`transcript.md`](/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/sample-inputs/transcript.md)

Observed characteristics:

- The file already demonstrates a readable transcript presentation with bracketed timecodes and speaker/language annotations.
- It is useful as a presentation reference, but it is not rich enough to serve as the canonical source model because it has already been flattened into a document.

Suggested evidence window:

- `transcript.md`, lines 1-20.

## Key Findings

1. The transcript ingestion layer should be schema-flexible, not hard-coded to one shape.
2. Wall-clock timestamps are present in the main transcript and can be parsed into epoch milliseconds.
3. Relative times should be derived after normalization, not assumed to exist in the input.
4. The sample contains at least one out-of-order timestamp, so sorting must be stable and explicit.
5. The QA sidecar proves that the app must support multiple JSONL schemas and record types, not only flat transcript segments.
6. Interactive transcript rows should seek audio by setting `HTMLMediaElement.currentTime`, which is the standard browser mechanism for audio seeking.
7. HTML should be the primary presentation format because it supports interactivity, keyboard control, print styling, and PDF export via browser print.

## Canonical Data Model

The normalization layer should produce a single in-memory model that can represent multiple input schemas without losing raw provenance.

```ts
type TranscriptBundle = {
  bundleId: string;
  recordingKey: string;
  audioTracks: AudioTrack[];
  transcriptSources: TranscriptSource[];
  annotations: TranscriptAnnotation[];
  paragraphs: TranscriptParagraph[];
};

type AudioTrack = {
  trackId: string;
  sourcePath: string;
  fileName: string;
  displayName: string;
  durationMs?: number;
  selected: boolean;
  startOffsetMs?: number;
};

type TranscriptSource = {
  sourceId: string;
  sourcePath: string;
  schemaName: string;
  recordingBasename?: string;
  rawLineCount: number;
};

type TranscriptSegment = {
  segmentId: string;
  sourceId: string;
  lineNumber: number;
  raw: Record<string, unknown>;
  speakerRaw?: string;
  speakerLabel: string;
  sourceLabel?: string;
  language?: string;
  model?: string;
  text: string;
  wallClockIso?: string;
  wallClockMs?: number;
  relativeStartMs: number;
  relativeEndMs?: number;
  durationMs?: number;
  trackId?: string;
  orderIndex: number;
};

type TranscriptAnnotation = {
  annotationId: string;
  sourceId: string;
  kind: "question" | "answer" | "note";
  title: string;
  body: string;
  wallClockIso?: string;
  wallClockMs?: number;
  recordingMs?: number;
  windowStartMs?: number;
  windowEndMs?: number;
  trackId?: string;
  raw: Record<string, unknown>;
};

type TranscriptParagraph = {
  paragraphId: string;
  trackId?: string;
  speakerLabel: string;
  sourceLabel?: string;
  language?: string;
  startMs: number;
  endMs: number;
  text: string;
  segmentIds: string[];
};
```

## Normalization Pipeline

The ingestion pipeline should be deterministic and line-oriented:

1. Read the file as JSONL, one line at a time.
2. Parse each line independently.
3. Classify the record by schema shape.
4. Preserve the raw object and source line number.
5. Validate mandatory fields for the inferred schema.
6. Parse wall-clock timestamps into epoch milliseconds.
7. Derive relative offsets.
8. Sort stably by time and original order.
9. Group adjacent segments into paragraphs.
10. Attach the normalized records to the relevant audio track or recording bundle.

### Schema normalization rules

- Keep the raw payload in `raw` for provenance and debugging.
- Treat unknown fields as pass-through metadata.
- Reject malformed JSON immediately with file name and line number.
- Reject transcript records that are missing the fields needed for navigation, such as `timestamp` or `text`.
- Accept QA sidecar records as annotations rather than transcript segments.
- Normalize `speaker` to a display label while preserving the raw speaker token.

### Timestamp cleanup

The sample data uses ISO wall-clock strings such as `2026-05-14T13:00:15.048Z`. In TypeScript, `Date.parse()` is suitable for parsing these strings into epoch milliseconds, and `Date` objects represent milliseconds since the Unix epoch.

Recommended behavior:

- Parse the wall-clock timestamp first.
- Store the parsed milliseconds separately from the original string.
- Preserve the original string for display and audit.
- If parsing fails, mark the row invalid and surface the source line number.

### Relative-time derivation

Relative time should be derived after parsing, not stored as an input assumption.

Recommended derivation order:

1. Use explicit recording-relative metadata if available, such as `ts_recording_ms`.
2. Otherwise use the earliest valid wall-clock timestamp in the bundle as the anchor.
3. Otherwise use a user-supplied anchor when multiple audio files need explicit alignment.

For a transcript segment:

- `relativeStartMs = wallClockMs - anchorMs`
- `relativeEndMs = relativeStartMs + durationMs`

For a QA annotation:

- Prefer `ts_recording_ms` when it exists.
- Keep the wall-clock time as display metadata.
- Link the annotation to the transcript window if both start and end bounds are present.

### Why stable sort is required

The local transcript contains one inversion where an earlier wall-clock timestamp appears after a later one in the source file. That means:

- Rendering must not assume input order equals chronological order.
- Paragraph grouping must operate on the sorted sequence.
- Original order should still be retained as a tie-breaker so the renderer can remain deterministic.

## Paragraph Grouping

The best default is to group for readability, not to mirror every raw ASR fragment.

Recommended grouping heuristic:

- Start a new paragraph when the speaker changes.
- Start a new paragraph when the audio track changes.
- Start a new paragraph when the gap between adjacent segments exceeds a configurable threshold.
- Merge same-speaker fragments when the gap is short and the text reads like a continuation.

Suggested default threshold:

- 1200 to 2500 milliseconds, tuned after reviewing real transcripts.

Recommended implementation details:

- Group only after stable sorting.
- Use the same heuristic for all transcript sources within a bundle.
- Preserve the underlying segment IDs so clicking a paragraph can still navigate to the exact source segment.
- Keep punctuation and casing from the source text unless a cleanup pass is explicitly requested.

Practical note from the sample:

- The file has many short fragments from the same speaker and several long monologues.
- A paragraph layer will improve readability materially without requiring destructive rewrite of the source text.

## Speaker and Source Labeling

The `speaker` field in the sample is an opaque label, not a friendly participant name.

Recommended display strategy:

- Render `speaker` as `Speaker 1`, `Speaker 2`, etc. by default.
- Allow an optional participant map to rename speakers later.
- Render `source` separately from `speaker` because it appears to describe ingestion origin, not person identity.
- Preserve `language` as a badge or metadata chip when multilingual text is present.

For the QA sidecar:

- Render the record as an annotation block, not as a conversational speaker turn.
- Show the `recording_basename` link to make the mapping explicit.

## Transcript-Driven Audio Navigation

The browser media API already provides the primitive needed for clickable transcript rows: set `HTMLMediaElement.currentTime` to seek playback, and listen for the `seeked` event to know the operation completed.

Recommended interaction model:

- Each transcript row stores the target track and the target time in milliseconds.
- Clicking a row converts the target time to seconds and assigns it to the selected audio element(s).
- After the seek completes, the UI highlights the active row and track.
- If multiple audio tracks are selected, seek all selected tracks to the same relative point unless a per-track offset map says otherwise.

Important implementation point:

- `currentTime` is a floating-point number in seconds, so the UI should always convert from milliseconds explicitly.

### Single-track versus multi-track behavior

For one selected audio track:

- Seek that track only.
- Use the transcript row timestamp as the exact navigation target.

For multiple selected tracks:

- Treat one track as the clock source or master track.
- Seek the other selected tracks to their corresponding offsets.
- If offsets are unknown, seek all selected tracks to the same relative point and show any detected drift in the UI.

### Drift handling

Because browser audio elements are not sample-locked, the application should expect drift in multi-track playback.

Recommended strategy:

- Periodically compare the master clock to the slave tracks.
- Apply small corrections when drift exceeds a tolerance threshold.
- If the user is only reviewing and not mixing, prioritize perceptual sync over sample-perfect sync.

## Presentation and Export Strategy

### HTML first

HTML should be the canonical presentation format because it can support:

- click-to-seek transcript rows,
- track badges and state indicators,
- keyboard navigation,
- search and filtering,
- print styles for PDF export,
- and local playback controls.

This also keeps the presentation close to the web platform primitives documented by MDN for media playback and printing.

### Markdown export

Markdown is useful as a lightweight, reviewable artifact:

- It is diff-friendly.
- It is easy to archive.
- It is good for static documentation or handoff.

Recommended shape:

- A heading per paragraph or speaker turn.
- Timecode in a consistent bracketed format.
- Speaker label and language label inline.

### PDF export

PDF should be treated as a print rendering of the HTML output, not as a separate rendering system.

Recommended path:

- Generate HTML.
- Apply `@media print` styles.
- Use `window.print()` for browser-side PDF generation or preview.

This is the cleanest path because CSS print media is explicitly designed for controlling how HTML renders on paper or as a PDF.

## Multiple Transcript Files Mapped to Multiple Audio Files

The app should treat transcript files and audio files as separate inputs that are later bound into a recording bundle.

Recommended matching priority:

1. Explicit user mapping.
2. Manifest file mapping.
3. Exact basename match after removing known suffixes.
4. Normalized stem match.
5. Manual correction UI if more than one candidate remains.

For example:

- `recording-2026-05-14-15-59.transcript.jsonl` maps naturally to the `recording-2026-05-14-15-59.*.m4a` family.
- `recording-2026-05-14-15-59.m4a.questions.jsonl` should be attached to the same bundle via `recording_basename`, not treated as a separate conversation.

Recommended bundle fields:

- Recording key or session ID.
- One or more audio tracks.
- One or more transcript sources.
- Optional per-track offset map.
- Optional participant map.
- Optional export settings.

### Multiple-track alignment

When multiple audio tracks represent the same conversation from different sources, the application should keep track-level offsets explicit.

Recommended behavior:

- Store per-track `startOffsetMs`.
- When a transcript row is clicked, resolve the target offset against the currently active audio track.
- Keep the base transcript time independent of any one audio file so the same transcript can drive different selected subsets.

## TypeScript Implementation Notes

These recommendations are implementation-level, not a final codebase design, but they are the practical shape that should hold up in a TypeScript application.

- Use a streaming or line-by-line JSONL reader for large files.
- Keep normalization pure and side-effect free.
- Separate parsing, alignment, paragraph grouping, and rendering into different modules.
- Keep audio control logic isolated from transcript parsing logic.
- Represent schema-specific records with discriminated unions rather than one permissive blob type.
- Surface file and line numbers in all validation errors.
- Avoid silent fallbacks when a file cannot be mapped or parsed.

## Assumptions & Uncertainties

### Assumptions made

| Assumption | Confidence | Impact if wrong |
|---|---|---|
| The target app is browser-first or browser-compatible, because the request emphasizes clickable transcript rows that seek audio playback. | MEDIUM | If the app is desktop-only, the normalization model still works, but the export and media-control layer would shift from browser APIs to desktop APIs. |
| The main transcript JSONL is the primary source of conversational turns. | HIGH | If a different file is canonical, the bundle model should be re-anchored around that source. |
| The QA sidecar is an annotation stream, not a transcript segment stream. | HIGH | If it is meant to be merged into the transcript stream, the schema classifier should be broadened. |
| Speaker IDs are opaque labels that may need a participant map later. | HIGH | If they are already canonical person IDs, the UI can render them directly. |
| The best export strategy is HTML first, Markdown and PDF derived from it. | MEDIUM | If the project needs document-first output only, the render pipeline can be simplified. |
| Relative timestamps should be derived from wall-clock timestamps after parsing. | HIGH | If the source system already provides accurate recording-relative offsets, those should become the primary navigation anchors. |

### Uncertainties and gaps

- Exact audio start alignment is not fully determined by the local JSONL sample alone.
- The sample does not reveal whether all transcript files will be paired with audio files via manifest, basename, or manual selection.
- The optimal paragraph gap threshold should be validated against more recordings.
- It is not yet clear whether transcript rows need editing, not just navigation.
- The tolerance for multi-track drift is not specified and should be confirmed before the sync layer is finalized.

### Clarifying questions for follow-up

1. Should the canonical recording anchor come from a manifest, the earliest transcript timestamp, or an explicit user-set start time?
2. Should transcript rows seek only the active track, or should every selected track move together by default?
3. How should the app behave when two transcript files map to one audio file or one transcript maps to multiple audio files?
4. Do you want read-only transcript presentation, or should the transcript be editable with persisted corrections?
5. Should paragraph grouping be configurable per transcript source, or fixed globally?
6. For PDF export, is browser print output sufficient, or do you want a server-generated PDF artifact?
7. Should QA sidecar records be shown inline with the transcript, or in a separate annotation panel?

## References

### Local sources

| Source | Path | What it contributed |
|---|---|---|
| Main transcript sample | [`recording-2026-05-14-15-59.transcript.jsonl`](/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/sample-inputs/recording-2026-05-14-15-59.transcript.jsonl) | Confirmed the primary JSONL shape, field set, speaker label pattern, wall-clock timestamps, and the need for stable sorting. |
| QA sidecar sample | [`recording-2026-05-14-15-59.m4a.questions.jsonl`](/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/sample-inputs/recording-2026-05-14-15-59.m4a.questions.jsonl) | Confirmed the presence of a second JSONL schema keyed by recording basename, with both wall-clock and recording-relative timing. |
| Existing transcript render | [`transcript.md`](/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/sample-inputs/transcript.md) | Showed a useful document-first presentation pattern with human-readable timecodes and speaker labels. |

### Official and primary docs

| Source | URL | What it contributed |
|---|---|---|
| JSON Lines | https://jsonlines.org/ | Established JSONL as one JSON value per line and a line-oriented processing model. |
| MDN: `Date.parse()` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse | Confirmed that ISO-like timestamp strings can be parsed into epoch milliseconds in JavaScript. |
| MDN: `Date` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date | Confirmed that JavaScript `Date` represents milliseconds since the Unix epoch. |
| MDN: `HTMLMediaElement.currentTime` | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime | Confirmed that assigning `currentTime` seeks media playback in seconds. |
| MDN: `HTMLMediaElement` `seeked` event | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event | Confirmed that `seeked` fires after the seek operation completes. |
| MDN: `Window.print()` | https://developer.mozilla.org/en-US/docs/Web/API/Window/print | Confirmed browser-side print/PDF export support from an HTML document. |
| MDN: Printing with CSS | https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing | Confirmed that `@media print` is the right mechanism for print-specific transcript styling. |

## Summary

The research points to a canonical design in which JSONL is ingested line-by-line, normalized into a typed transcript bundle, grouped into readable paragraphs, and rendered in HTML as an interactive transcript that can seek audio tracks through `currentTime`.

The local samples make two things clear:

- the transcript data is flexible enough that schema normalization is required, and
- the transcript UI should not trust input order, because at least one source record is out of chronological order.

HTML should be the primary presentation target, with Markdown and PDF generated from the same normalized model when needed.
