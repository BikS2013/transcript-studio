# Plan 005: Build Sync Transcript Studio

## Provenance

- Refined request: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-build-synchronized-audio-transcript-tool.md`
- Investigation: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/investigation-synchronized-audio-transcript-tool.md`
- Technical research:
  - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/research/web-audio-synchronized-playback.md`
  - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/research/ffmpeg-m4a-processing.md`
  - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/research/jsonl-transcript-navigation.md`
- Proposal: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/design/proposal-synchronized-audio-transcript-tool.md`
- Codebase scan: skipped because this is a greenfield implementation folder. The target `sync-transcript-studio/` application source tree does not exist yet, and existing project files are documentation plus representative audio/transcript assets.

## Objective

Create `sync-transcript-studio/` as an isolated TypeScript local web application for synchronized M4A playback, JSONL transcript navigation, FFmpeg/ffprobe-backed derived outputs, and session/export management. The first implementation target is review-grade synchronization around 50-100 ms, not sample-accurate audio mastering.

## Key Decisions

- Use the accepted local browser workspace plus Node.js/TypeScript backend architecture from the investigation.
- Keep original audio and transcript files immutable; all generated media, transcript exports, manifests, and stats are derived outputs with collision checks.
- Use long-file browser playback through media elements bridged into one Web Audio context for timing, routing, mute/solo, drift monitoring, and playhead UI.
- Treat transcript JSONL as line-oriented input normalized into a canonical transcript bundle; classify QA sidecars as annotations.
- Invoke FFmpeg/ffprobe with safe argument arrays through Node process APIs. Do not use shell-interpolated command strings.
- Raise explicit missing-prerequisite/configuration errors. Do not silently substitute fallback values.
- Run dependency vetting before package manifest edits; the implementation/dependency agent owns exact version choices and audit entries.

## File and Module Boundaries

All application code, package metadata, and package-local tests land under `sync-transcript-studio/`.

```text
sync-transcript-studio/
  package.json
  tsconfig*.json
  src/
    shared/
      types/                  # Audio track, transcript bundle, session, job DTOs
      time/                   # Timestamp formatting and ms/sec conversion helpers
    backend/
      server/                 # Local HTTP API and static UI serving
      config/                 # Explicit config/prerequisite validation
      ffmpeg/                 # ffprobe parsing, FFmpeg arg builders, job runner
      session/                # Session manifest load/save and output naming
      transcript/             # JSONL parse, schema classify, normalize, group, export HTML
    frontend/
      app/                    # App shell and state orchestration
      audio/                  # Track transport, Web Audio routing, drift monitor
      transcript/             # Search, filters, active row, click-to-seek
      processing/             # Probe/export/denoise/loudness job controls
      session/                # Manifest open/save and derived output status
      styles/                 # Work-focused responsive UI styles
  tests/
    unit/
    integration/
```

If tool documentation/config scaffolding is required before implementation, use the project tool-convention workflow or the closest available `tool-doc-config-architect` workflow, and keep tool docs under the established project documentation locations.

## Phases

### Phase 1: Scaffold and Guardrails

- Create the dedicated `sync-transcript-studio/` TypeScript package.
- Vet all runtime/dev dependencies before editing package manifests.
- Add explicit FFmpeg/ffprobe prerequisite checks.
- Define package-local test, lint, build, and dev commands.
- Establish immutable source and derived-output path rules.

### Phase 2: Shared Domain Model

- Define shared types for audio tracks, transcript sources, transcript segments, annotations, paragraphs, FFmpeg jobs, derived outputs, and session manifests.
- Implement time utilities for milliseconds, seconds, and `HH:MM:SS.mmm` display.
- Define review-grade sync thresholds in configuration with explicit required values.

### Phase 3: Backend Core

- Implement local API endpoints for probing audio, loading transcript JSONL, saving/loading session manifests, and launching/cancelling processing jobs.
- Implement `ffprobe` metadata extraction for duration, codec, sample rate, channel count/layout, bit rate, and tags.
- Implement safe FFmpeg argument builders for mixed review export, source-separated export where feasible, denoise preview/export, and loudness calibration stats.
- Add output naming and collision prevention before any write.

### Phase 4: Transcript Pipeline

- Parse JSONL line by line with file and line-number errors.
- Normalize main transcript records with `speaker`, `id`, `durationSec`, `source`, `model`, `text`, `timestamp`, and `language`.
- Classify QA sidecar records as annotations.
- Derive recording-relative timestamps from explicit recording offsets when present, otherwise from the selected anchor policy.
- Stable-sort by normalized timestamp and original line number, then group readable paragraphs.
- Generate HTML transcript export from the canonical bundle.

### Phase 5: Frontend Workspace

- Build a dense local workspace with track list, transport controls, drift monitor, transcript pane, processing panel, and session/output status.
- Implement synchronized play, pause, resume, seek, rewind, fast-forward, reset, mute, solo, and manual offset controls for selected tracks.
- Use `HTMLMediaElement.currentTime` plus `seeked` for group seeks, and Web Audio routing for mute/solo and drift monitoring.
- Implement transcript search, filters, active-row highlighting where practical, and click-to-seek for selected tracks.

### Phase 6: Processing and Exports

- Wire backend FFmpeg jobs to frontend status, errors, cancellation, and validation results.
- Validate derived outputs for existence, non-empty size, and expected media metadata where practical.
- Persist derived output records and processing stats in the session manifest.
- Ensure interrupted or failed processing never overwrites or mutates source files.

### Phase 7: Testing, Review, and Integration Verification

- Add unit tests for timestamp formatting, transcript classification/normalization/grouping, FFmpeg argument construction, and output collision logic.
- Add integration tests or validation scripts for missing FFmpeg/ffprobe errors, malformed JSONL line errors, non-destructive output behavior, and representative sample-file probing.
- Add practical UI validation for playback controls, transcript click-to-seek, and visible drift status.
- Run build, tests, package audit, and local app smoke validation before final report.

## Testing and Validation Strategy

- Package-local tests live in `sync-transcript-studio/tests/` when owned by the new package.
- Cross-project or ad hoc validation scripts, if needed, must live under root `test_scripts/`.
- Tests must prove FFmpeg/ffprobe commands are built as executable plus argument arrays, not shell command strings.
- Transcript tests must include malformed JSONL, out-of-order timestamps, QA sidecar classification, and file/line-number diagnostics.
- Output tests must assert collision errors and source-file immutability.
- UI validation must cover desktop and mobile-width layout enough to ensure controls and transcript text do not overlap.

## Acceptance Checks

- `sync-transcript-studio/` exists and contains all application source, package files, and package-local tests.
- The app starts locally and serves a browser workspace.
- Representative M4A files can be probed, loaded, selected, muted/soloed, offset-adjusted, and controlled together.
- Transcript JSONL loads, normalizes, renders grouped text, supports search/filtering, and seeks selected audio tracks.
- Malformed JSONL reports file and line number.
- FFmpeg/ffprobe missing prerequisites report explicit errors.
- FFmpeg jobs preserve originals, prevent collisions, validate derived outputs, and record stats/output paths.
- At least one HTML transcript presentation export is produced.
- A session manifest records tracks, transcript sources, offsets, selection/mute/solo state, anchors, derived outputs, and user corrections.
- Dependency vetting and audit results are recorded by the implementation/dependency-validation phase.
- `docs/design/project-design.md`, `docs/design/project-functions.MD`, and `Issues - Pending Items.md` remain synchronized with implementation-era decisions.
