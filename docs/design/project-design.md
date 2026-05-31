# Project Design

## Current Design State

Transcript Studio is a standalone local-first TypeScript CLI and Electron desktop application for synchronized multi-track M4A playback, JSONL transcript navigation, and non-destructive FFmpeg-backed exports. The app is served by a Node.js/TypeScript backend and runs in both a browser workspace and an Electron desktop window without uploading source audio or transcripts to external services.

The project is self-contained in this folder. Application source, package metadata, package-local tests, staged local inputs, generated exports, design documents, reference documents, research, tool documentation, agent instructions, and issue tracking live under the project root.

## Design Decision Register

### Decision 001: Proposal-First Workflow

- Status: accepted
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-synchronized-audio-transcript-tool.md`
- Rationale: The requested tool had material architecture, synchronization, transcript, FFmpeg, and privacy decisions, so it required a proposal and questions before implementation.

### Decision 002: Local Browser Workspace Architecture

- Status: accepted
- Date: 2026-05-31
- Decision: Use a local browser-based TypeScript workspace served by a Node.js/TypeScript backend that invokes native FFmpeg.
- Evidence:
  - `docs/reference/investigation-synchronized-audio-transcript-tool.md`
  - `docs/research/web-audio-synchronized-playback.md`
  - `docs/research/ffmpeg-m4a-processing.md`
  - `docs/research/jsonl-transcript-navigation.md`
- Rationale: This approach balances local privacy, rich transcript navigation, synchronized multi-track playback, native FFmpeg processing, maintainability, and time-to-value.

### Decision 003: Non-Destructive Audio Processing

- Status: accepted
- Date: 2026-05-31
- Decision: Original audio files must never be overwritten. FFmpeg processing writes clearly named derived outputs only.
- Evidence: `docs/research/ffmpeg-m4a-processing.md`
- Rationale: Denoising, normalization, merging, and mixdown can degrade or materially change audio. The tool keeps source recordings immutable.

### Decision 004: HTML-First Transcript Presentation

- Status: accepted
- Date: 2026-05-31
- Decision: Use an interactive HTML transcript as the primary presentation surface, with Markdown/PDF as optional derived exports.
- Evidence: `docs/research/jsonl-transcript-navigation.md`
- Rationale: HTML supports clickable transcript rows, audio seeking, filters, search, print styling, and later export workflows from a single canonical transcript bundle.

### Decision 005: Static HTML Mockup Artifact

- Status: accepted
- Date: 2026-05-31
- Decision: Keep the standalone static HTML representation of the proposal mockups at `docs/design/mockups-synchronized-audio-transcript-tool.html`.
- Evidence: `docs/design/proposal-synchronized-audio-transcript-tool.md`
- Rationale: The static HTML file makes the design easier to inspect visually without requiring the application build or a dev server.

### Decision 006: Dedicated Application Folder

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-build-synchronized-audio-transcript-tool.md`
- Decision: Build the synchronized audio/transcript application as an isolated TypeScript project named `sync-transcript-studio`.
- Evidence:
  - `docs/design/plan-005-build-sync-transcript-studio.md`
  - `docs/design/proposal-synchronized-audio-transcript-tool.md`
  - `docs/reference/investigation-synchronized-audio-transcript-tool.md`
- Rationale: A dedicated folder keeps source, package metadata, build output, tests, generated outputs, and documentation separate from unrelated prep-call materials.

### Decision 007: First Implementation

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-build-synchronized-audio-transcript-tool.md`
- Decision: Implement the first local web application version of Sync Transcript Studio.
- Evidence:
  - `README.md`
  - `package.json`
  - `src/`
  - `tests/`
  - `docs/reference/implementation-report-sync-transcript-studio-2026-05-31.md`
  - `docs/reference/test-build-sync-transcript-studio-tests-2026-05-31.md`
- Rationale: The implementation validates the accepted local browser workspace plus Node backend design.
- Design notes: The backend exposes health, probe, transcript load/export, media streaming, FFmpeg planning, and FFmpeg execution endpoints. FFmpeg and ffprobe use executable-plus-argument arrays. Output writes are guarded by collision checks. The frontend provides the usable review workspace as the first screen.

### Decision 008: Dropped M4A Staging Bridge

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-m4a-drag-and-drop.md`
- Plan: `docs/design/plan-006-m4a-drag-and-drop.md`
- Codebase scan: `docs/reference/codebase-scan-m4a-drag-and-drop.md`
- Decision: Support browser drag-and-drop for M4A files by copying dropped file blobs into an app-managed local staging folder, then reuse the existing backend probe/media path against the staged copy.
- Evidence:
  - `src/backend/media/drop.ts`
  - `src/backend/server/index.ts`
  - `src/frontend/main.ts`
  - `src/frontend/drop/m4a.ts`
- Rationale: Browser drag-and-drop does not expose absolute local file paths to normal web apps. A local-only staging bridge preserves the local privacy model while allowing ffprobe, playback, dedupe, and FFmpeg processing to operate through the established path-based backend.

### Decision 009: Local File Picker and Transcript Drop Staging

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-transcript-drop-local-file-picker.md`
- Plan: `docs/design/plan-007-transcript-drop-local-file-picker.md`
- Codebase scan: `docs/reference/codebase-scan-transcript-drop-local-file-picker.md`
- Decision: Extend the local staging bridge to support JSONL transcripts and add browser file-picker controls for selecting M4A and JSONL files from local folders.
- Evidence:
  - `src/backend/media/drop.ts`
  - `src/backend/server/index.ts`
  - `src/frontend/main.ts`
  - `src/frontend/drop/jsonl.ts`
  - `src/frontend/api/client.ts`
- Rationale: File picker and drag/drop selections do not provide stable absolute paths to browser apps. Staging selected files locally keeps the privacy model intact while allowing the existing FFprobe and transcript JSONL parsers to continue working on backend-local paths.

### Decision 010: Resizable Review Workspace Panels

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-resizable-side-panels.md`
- Plan: `docs/design/plan-008-resizable-side-panels.md`
- Codebase scan: `docs/reference/codebase-scan-resizable-side-panels.md`
- Decision: Add native pointer-event resize handles for the left sidebar and right processing panel while allowing the transcript/review area to consume remaining width.
- Evidence:
  - `src/frontend/main.ts`
  - `src/frontend/layout/resize.ts`
  - `src/frontend/styles/app.css`
- Rationale: The app's CSS grid layout supports resizing without new dependencies or a new layout framework. Bounded widths keep panels usable and prevent transcript content from being pushed out of view.

### Decision 011: Self-Contained Relocation

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-move-sync-transcript-studio.md`
- Plan: `docs/design/plan-009-self-contained-relocation.md`
- Decision: Move Sync Transcript Studio-specific design, reference, research, tool, issue, and agent guidance documents into this project, then relocate the whole application outside the original prep-call folder.
- Rationale: Future agents and maintainers should be able to understand, run, test, and extend the app from this project root without consulting the parent `GTF-prep-call` folder.

### Decision 012: Transcript Studio CLI and Electron Desktop Surfaces

- Status: implemented
- Date: 2026-05-31
- Request source: `docs/reference/refined-request-transcript-studio-cli-electron.md`
- Plan: `docs/design/plan-010-transcript-studio-cli-electron.md`
- Codebase scan: `docs/reference/codebase-scan-transcript-studio-cli-electron.md`
- Decision: Rename the active product and command identity to Transcript Studio, expose `transcript-studio` as the canonical CLI command, and add an Electron desktop app that starts the same local backend and loads the existing workspace through `transcript-studio ui`.
- Evidence:
  - `package.json`
  - `src/cli/index.ts`
  - `src/cli/args.ts`
  - `src/electron/main.ts`
  - `src/electron/config.ts`
  - `docs/tools/transcript-studio.md`
  - `docs/reference/dependency-validation-transcript-studio-electron.md`
  - `docs/reference/implementation-report-transcript-studio-cli-electron-2026-05-31.md`
- Rationale: The existing local browser workspace already contains the core playback, transcript, staging, and FFmpeg behavior. A CLI launcher and thin Electron desktop shell provide the requested surfaces while avoiding duplicate processing implementations.

## Open Design Questions

- Should automatic offset detection be required in a future version?
- Which transcript anchor policy should be authoritative when multiple timestamp sources conflict?
- Which export shape should be the default: mixed review audio, source-separated audio, or both?
- Should full session manifest open/save controls be exposed in the UI?
- Should FFmpeg job cancellation be added to the next implementation slice?
- Should denoising remain FFmpeg-only, or should a later version support external denoising models?

## Design Constraints

- Application source changes must stay inside this project root.
- Tool implementation must be TypeScript.
- Missing configuration values must raise explicit errors; no fallback configuration values are allowed.
- Source audio and transcript files must not be overwritten.
- New dependencies must be vetted before being added.
- Test scripts created outside the package test suite must live under `test_scripts/`.
- No version-control operation may be performed unless explicitly requested.
