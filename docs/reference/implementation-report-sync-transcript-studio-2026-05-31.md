# Implementation Report: Sync Transcript Studio

## Summary

Built Sync Transcript Studio as an isolated TypeScript project in `sync-transcript-studio/`. The tool is a local browser workspace served by a Node.js backend for synchronized M4A review, JSONL transcript navigation, HTML transcript export, and non-destructive FFmpeg-backed derived outputs.

## Provenance

- Refined request: `docs/reference/refined-request-build-synchronized-audio-transcript-tool.md`
- Plan: `docs/design/plan-005-build-sync-transcript-studio.md`
- Proposal: `docs/design/proposal-synchronized-audio-transcript-tool.md`
- Investigation: `docs/reference/investigation-synchronized-audio-transcript-tool.md`
- Technical research:
  - `docs/research/web-audio-synchronized-playback.md`
  - `docs/research/ffmpeg-m4a-processing.md`
  - `docs/research/jsonl-transcript-navigation.md`
- Dependency validation: `docs/reference/dependency-validation-sync-transcript-studio.md`
- Test report: `docs/reference/test-build-sync-transcript-studio-tests-2026-05-31.md`

## Implementation Folder

- `sync-transcript-studio/`

## Major Capabilities Implemented

- Local HTTP server with static frontend serving.
- Health check for `ffmpeg` and `ffprobe`.
- Audio probing through `ffprobe` JSON output.
- Browser-readable media streaming endpoint with byte-range support.
- Track list UI with selected/mute/solo/offset controls.
- Selected-track transport controls: play, pause, resume, seek, rewind, fast-forward, drift display.
- JSONL transcript loading with file/line errors.
- Transcript segment normalization, sidecar annotation classification, paragraph grouping, search/filtering, and click-to-seek.
- HTML transcript export with output collision protection.
- FFmpeg command plan generation for mix, source-separated, denoise, and loudness operations.
- FFmpeg job execution endpoint using executable-plus-argument arrays, output collision checks, and output validation.
- Package-local Vitest coverage for timestamp utilities, transcript parsing/grouping, FFmpeg command safety, collision handling, and session manifest behavior.

## Dependencies Added

Dev dependencies only:

- `typescript@^6.0.3`
- `vite@^8.0.14`
- `vitest@^4.1.7`
- `@types/node@^25.9.1`

Preflight dependency validation and package-local audit both reported no high-or-above advisories.

## Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- `npm test` passed: 6 files, 13 tests after the M4A loading regression fixes.
- `npm audit` passed: 0 vulnerabilities.
- API smoke checks passed:
  - `GET /api/health`
  - `POST /api/probe` against `recording-2026-05-14-15-59.mic.m4a`
  - `POST /api/transcripts/load` against `recording-2026-05-14-15-59.transcript.jsonl`
  - `GET /api/media` byte-range response for representative M4A
  - `POST /api/process/plan`
  - `POST /api/transcripts/export-html`
  - `POST /api/process/run` using generated 0.5-second silent M4A inputs
- Headless Chrome rendered the built UI and produced `/tmp/sync-transcript-studio-smoke.png`.
- Browser automation verified both representative M4A files load as two separate tracks after the probe-response and track-ID fixes.

## Post-Implementation Fixes

- Fixed the frontend probe client to unwrap `/api/probe` responses from `{ results: [...] }`.
- Fixed transcript HTML export client payloads to send `bundle`, matching the backend contract.
- Fixed track ID generation to hash the full file path instead of truncating a shared prefix.
- Added regression tests for frontend API response handling and distinct IDs for paths that share a long prefix.
- Fixed playback-control responsiveness by replacing continuous full-app re-renders during playback with targeted live DOM updates for timecode, progress, drift/status cells, and active transcript rows.

## Generated Validation Outputs

The following derived files were created under `sync-transcript-studio/exports/` for smoke validation:

- `smoke-input-a.m4a`
- `smoke-input-b.m4a`
- `smoke-mix-run.m4a`
- `smoke-transcript.html`

No source audio or source transcript file was modified.

## Known Limitations

- First-version synchronization is browser/media-element based and targets review-grade tolerance, not sample-accurate mastering.
- Automatic offset detection is not implemented; manual offsets are supported.
- Transcript editing is not implemented; transcript presentation/navigation/export are implemented.
- FFmpeg processing cancellation is not implemented yet.
- Session manifest helpers exist, but full UI open/save controls are not yet exposed.
- Source-separated export preserves inputs as separate audio streams in one output container; it is not AI source separation.

## Local Use

```bash
cd /Users/giorgosmarinos/Documents/sync-transcript-studio
npm install
npm run build
npm start
```

Then open the printed localhost URL.
