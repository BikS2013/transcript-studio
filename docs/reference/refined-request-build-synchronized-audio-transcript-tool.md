# Refined Request: Build Synchronized Audio Transcript Tool

## Category
Development

## Objective
Implement the previously proposed synchronized audio and transcript application tool as a dedicated TypeScript project folder inside `/Users/giorgosmarinos/Documents/GTF-prep-call`, using the handover document and existing proposal/design artifacts as authoritative context. The implementation must provide a local-first browser workspace served by a Node.js/TypeScript backend for synchronized multi-track M4A playback, transcript JSONL ingestion and timestamp-linked navigation, FFmpeg/ffprobe-backed non-destructive audio processing, session/output management, and focused validation, while keeping the new application isolated from other project files.

## Scope
- **In scope**:
  - Read and use the handover at `/var/folders/rx/l8_ds8td2rjdr9bvk09x5x9m0000gn/T/gtf-prep-call-handoff-synchronized-audio-tool.md`.
  - Reuse the existing design specification at `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-synchronized-audio-transcript-tool.md` as product/design context, while treating this file as the implementation-specific scope.
  - Reuse the existing investigation, technical research, proposal, plan, project design register, function register, mockup artifact, and pending-items file as implementation context:
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/investigation-synchronized-audio-transcript-tool.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/research/web-audio-synchronized-playback.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/research/ffmpeg-m4a-processing.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/research/jsonl-transcript-navigation.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/design/proposal-synchronized-audio-transcript-tool.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/design/plan-001-synchronized-audio-transcript-tool.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/design/mockups-synchronized-audio-transcript-tool.html`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/design/project-design.md`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/design/project-functions.MD`
    - `/Users/giorgosmarinos/Documents/sync-transcript-studio/Issues - Pending Items.md`
  - Create the implementation in one dedicated folder under the project root, assumed to be `sync-transcript-studio/` unless a naming conflict requires a documented alternative.
  - Scaffold and implement a TypeScript local web application with a browser UI and local Node.js/TypeScript backend, following the previously recommended architecture.
  - Implement audio loading/probing for one or more M4A files, including track metadata, selected/active state, mute/solo state, offset, playback status, and derived-output status.
  - Implement synchronized playback controls for selected tracks, including play, pause, resume, seek-to-timestamp, rewind, fast-forward, manual offsets, and drift visibility.
  - Implement transcript JSONL ingestion, line-by-line parsing, schema normalization, timestamp cleanup, segment/annotation classification, readable transcript grouping, search/filtering, and click-to-seek navigation.
  - Implement FFmpeg/ffprobe-backed non-destructive processing workflows for probing, mixed review export, source-separated export where feasible, conservative denoise preview/export, loudness calibration, and processing stats capture.
  - Implement session/output handling, including a session manifest and explicit derived-output naming that never overwrites source audio or source transcript files.
  - Include focused tests and validation for transcript parsing/normalization, timestamp mapping, FFmpeg command construction, output collision handling, non-destructive behavior, missing-prerequisite errors, and core UI/playback logic where practical.
  - Use dedicated downstream agents or equivalent separated work phases for planning/design, coding, testing, review, dependency validation, and integration verification when the execution environment supports that orchestration.
- **Out of scope**:
  - Reopening the previously completed architecture investigation unless implementation uncovers a concrete blocker.
  - Building an Electron desktop app as the first version.
  - Building a hosted/cloud processing service.
  - Uploading audio or transcript files to external services.
  - Running destructive edits on original audio or transcript files.
  - Performing full AI speaker diarization or transcription generation unless a separately configured diarization/transcription capability is approved later.
  - Editing the existing proposal-only refined request; this implementation request is represented by a separate refined request file.
  - Performing version control operations.

## Requirements
1. The implementation must be created under a dedicated project-root folder, assumed to be `sync-transcript-studio/`, and must not mix application source, package files, build outputs, or tests into unrelated existing project areas.
2. The implementation must be TypeScript-based for both the browser-facing application code and the local backend/tooling code.
3. Before scaffolding project-tool documentation or configuration, downstream implementation must follow the project tool-convention requirements from `CLAUDE.md`; if the mandatory `/tool-conventions scaffold <tool-name>` workflow is unavailable in the current runtime, the implementer must document that constraint and use the closest available tool-doc/config convention workflow.
4. Dependency additions must be vetted before manifest edits: identify current stable versions, check known advisories for candidate versions, pin vetted caret ranges, record the vetted-on date in `Issues - Pending Items.md`, install, and run the package audit command with no high-or-above advisories before the dependency step is complete.
5. The app must expose a local browser workspace served by a Node.js/TypeScript backend unless a later blocking technical finding requires a documented change.
6. The backend must verify FFmpeg and ffprobe availability and raise explicit errors when required executables or configuration values are missing.
7. The backend must invoke FFmpeg and ffprobe using argument arrays through safe process APIs, not shell-interpolated command strings.
8. The app must allow loading one or more M4A files and must display track metadata including filename/display name, duration, codec/sample-rate/channel metadata where available, selection state, mute/solo state, offset, playback status, and derived-output status.
9. The app must support synchronized playback for all selected tracks, including play, pause, resume, seek-to-timestamp, fixed-step rewind, fixed-step fast-forward, per-track mute/solo, and reset-to-start behavior.
10. The app must support manual per-track offset correction and must surface drift between selected tracks against a documented review-grade tolerance.
11. The app must treat perceptual review synchronization as the first-version target, assumed to be approximately 50-100 ms, unless the user later requests sample-accurate synchronization.
12. The app must load one or more transcript JSONL files and parse them line by line with explicit file and line-number errors for malformed records.
13. Transcript normalization must support at least the representative project transcript fields `speaker`, `id`, `durationSec`, `source`, `model`, `text`, `timestamp`, and `language`, while preserving raw-record provenance.
14. Transcript normalization must classify transcript segment records separately from Q&A or annotation sidecar records when schemas differ.
15. Transcript timestamps must be normalized to clean recording-relative display timestamps such as `HH:MM:SS.mmm` or `MM:SS`, using explicit recording-relative fields when present and otherwise using session/audio/transcript anchors.
16. The transcript UI must provide readable grouped transcript presentation with timestamp, speaker/source labels, optional language indicators, search, filters, active-row highlighting during playback where practical, and click-to-seek behavior for selected audio tracks.
17. The app must export or generate a transcript presentation artifact, with HTML as the first-class format and Markdown/PDF treated as optional derived outputs unless implementation capacity allows them.
18. FFmpeg processing must preserve original audio files and write only derived outputs with explicit names and collision checks.
19. The app must support FFmpeg/ffprobe probing, mixed review export, source-separated export where feasible, conservative denoise preview/export, and loudness calibration with stats capture.
20. Processing workflows must provide clear status, errors, output paths, and validation results, including checks that derived files exist, are non-empty, and have expected media metadata where practical.
21. The app must maintain a session manifest covering loaded tracks, transcript files, offsets, selection/mute/solo state, transcript anchor policy, derived outputs, and relevant user corrections.
22. Test scripts created outside the application package's normal test runner must live under `test_scripts/`; package-local tests may live inside the dedicated implementation folder if that folder owns the test runner.
23. Downstream execution must keep `docs/design/project-design.md`, `docs/design/project-functions.MD`, and `Issues - Pending Items.md` synchronized when implementation decisions, function coverage, dependency vetting, or resolved pending items materially change the project record.
24. The final implementation report must list the refined request file, implementation folder, major files created or modified, dependencies added and vetted, tests/audits run, validation results, known limitations, and unresolved issues.

## Constraints
- The project root is `/Users/giorgosmarinos/Documents/GTF-prep-call`.
- The prior proposal/design request was design-only and explicitly excluded implementation; it may be reused as product context but does not replace this implementation-specific request.
- The implementation must stay local-first and must not upload audio or transcript content to external services.
- Missing configuration settings must raise explicit errors; project instructions prohibit fallback configuration values.
- Original audio and transcript inputs must never be overwritten.
- Full diarization is not an FFmpeg-only capability and must not be claimed unless a separate diarization/transcription capability is explicitly configured and approved.
- All plans must remain under `docs/design/` and use the `plan-xxx-<indicative-description>.md` naming pattern.
- Reference material must remain under `docs/reference/`; research material must remain under `docs/research/`.
- The project currently has `CLAUDE.md` but no root `AGENTS.md`; do not create `AGENTS.md` unless downstream implementation scope requires it or the user approves it.
- No version control operation may be performed unless explicitly requested by the user.
- The user requested dedicated sub-agents for design, planning, coding, testing, and validation; if the active runtime cannot dispatch those agents directly, downstream work must preserve equivalent separation through clearly scoped phases, artifacts, and context handoffs.

## Acceptance Criteria
1. A markdown refined request file exists at `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-build-synchronized-audio-transcript-tool.md`.
2. The implementation exists in one dedicated folder under the project root, assumed to be `/Users/giorgosmarinos/Documents/sync-transcript-studio/`, with no application source or package files mixed into unrelated project directories.
3. The app can be started locally and presents a browser workspace for synchronized audio review and transcript navigation.
4. The app can load representative M4A files, display track metadata, select active tracks, and control selected-track playback with play, pause, resume, seek, rewind, fast-forward, mute/solo, and manual offset behavior.
5. The app surfaces drift or sync status for selected tracks using a documented review-grade tolerance.
6. The app can load the representative project transcript JSONL file, normalize timestamps, render a readable transcript, filter/search transcript text, and seek selected audio tracks from transcript entries.
7. The app handles malformed JSONL records with explicit file and line-number errors.
8. The backend verifies FFmpeg and ffprobe availability and reports explicit missing-prerequisite errors.
9. FFmpeg/ffprobe commands are constructed using argument arrays and have tests or review evidence showing they are not shell-interpolated strings.
10. FFmpeg processing writes only derived outputs, prevents accidental overwrite collisions, validates generated outputs where practical, and leaves original audio/transcript files unchanged.
11. The app can produce at least one transcript presentation export in HTML format.
12. A session manifest records loaded tracks, transcript files, selected state, offsets, anchors, and derived outputs.
13. Dependency vetting is recorded in `Issues - Pending Items.md`, and the package audit command completes without high-or-above advisories for the implementation package.
14. Focused tests and/or validation scripts cover transcript normalization, timestamp mapping, FFmpeg command construction, output collision behavior, missing prerequisites, and non-destructive output behavior.
15. `docs/design/project-design.md` and `docs/design/project-functions.MD` are updated if implementation materially changes design decisions or functional coverage.
16. The final implementation report includes files changed, tests run, audit results, limitations, and unresolved blockers.

## Assumptions
- The existing proposal's recommended local browser app plus Node.js/TypeScript backend is now accepted as the implementation target because the user asked to build the tool from the handover and did not reopen architecture selection.
- The dedicated folder name should be `sync-transcript-studio/`, based on the proposal's working name, unless an implementation-time conflict is detected.
- First-version synchronization should target perceptual review quality around 50-100 ms rather than sample-accurate audio mastering.
- Manual offset correction is sufficient for the first implementation; automatic offset detection can be deferred unless time and architecture permit it without broadening the initial scope.
- Transcript editing is out of scope for the first implementation; transcript presentation and navigation are in scope.
- HTML transcript export is required first; Markdown/PDF exports are optional unless capacity permits.
- Denoising should use conservative FFmpeg-backed presets first, not AI/RNNoise-style denoising.
- The app should remain fully offline/local-only for the first implementation.
- Existing sample M4A and JSONL files in the project root are representative validation inputs but should not be modified.
- Direct sub-agent orchestration may not be available in every runtime; separated implementation phases and scoped handoff artifacts are acceptable if subagents cannot be dispatched.

## Open Questions
No blocking open questions remain for producing the implementation specification. Downstream implementation should still track non-blocking product choices from `Issues - Pending Items.md`, especially export defaults, exact synchronization tolerance, output directory convention, and whether transcript editing should be added later.

## Original Request
Read the handover document from /var/folders/rx/l8_ds8td2rjdr9bvk09x5x9m0000gn/T/gtf-prep-call-handoff-synchronized-audio-tool.md
Use it to build the tool as described in the documentation.
I want you to build it inside a dedicated folder to avoid mixing it with the other projects running in this directory.
Also, use dedicated sub-agents for design, planning, coding, testing, validating, etc., to avoid polluting and to minimize the memory context consumption.
