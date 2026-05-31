---
language: TypeScript
framework: none
package_manager: npm
build_command: npm run build
test_command: npm test
lint_command: null
entry_points:
  - src/backend/server/index.ts
  - src/frontend/main.ts
last_scanned_commit: null
scanned_for_request: refined-request-m4a-drag-and-drop.md
scanned_at: 2026-05-31T12:33:30Z
---

# Codebase Scan — Sync Transcript Studio

## 1. Project Overview
`sync-transcript-studio/` is a local-first TypeScript app with a Node HTTP backend and a browser UI. The backend exposes health, probe, transcript, processing, and media routes, while the frontend renders the track/transcript workspace and drives playback against locally accessible media paths. The current design is path-based rather than file-upload based, which is important for the drag-and-drop request because the app does not yet have a browser-to-backend file staging bridge.

## 2. Module Map
- `src/backend/` - Local HTTP server, prerequisite checks, ffprobe mapping, FFmpeg planning, transcript JSONL loading/export, and session manifest persistence. Representative symbols: `startServer`, `probeAudioFile`, `buildProcessingPlan`, `loadJsonlTranscripts`. See [`src/backend/server/index.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/server/index.ts:18), and related submodules [`src/backend/ffmpeg/probe.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/ffmpeg/probe.ts:33), [`src/backend/ffmpeg/commands.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/ffmpeg/commands.ts:14), [`src/backend/transcript/jsonl.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/transcript/jsonl.ts:27), [`src/backend/config/prerequisites.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/config/prerequisites.ts:18), [`src/backend/session/manifest.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/session/manifest.ts:9).
- `src/frontend/` - Browser app shell and state machine for track probing/loading, playback, transcript review, and processing/export forms, plus the API client and CSS skin. Representative symbols: `renderTrackPanel`, `probeTrack`, `playSelected`, `StudioApiClient`. See [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:101), [`src/frontend/api/client.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/api/client.ts:24), [`src/frontend/styles/app.css`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/styles/app.css:1).
- `src/shared/` - Shared types and timestamp helpers used by both halves of the app. Representative symbols: `AudioTrack`, `TranscriptBundle`, `formatTimestamp`, `parseTimestampToMs`. See [`src/shared/types.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/shared/types.ts:1) and [`src/shared/time/format.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/shared/time/format.ts:1).

## 3. Conventions
- ESM-style imports are used throughout, including `.js` suffixes on local relative imports and `type`-only imports where the value is not needed. That pattern appears in the backend server, frontend entry point, and API client. [`src/backend/server/index.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/server/index.ts:1), [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:1), [`src/frontend/api/client.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/api/client.ts:1)
- Error handling is exception-based at the boundaries, then converted into user-visible state or JSON responses. The frontend wraps request failures in `ApiError` and the main event handler catches exceptions into `state.errorMessage`; the backend turns thrown route errors into JSON with 400/500 status codes. [`src/frontend/api/client.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/api/client.ts:12), [`src/frontend/api/client.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/api/client.ts:79), [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:476), [`src/backend/server/index.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/server/index.ts:76)
- Track loading is path-based and dedupes by stable track id. `probeAudioFile()` produces a normalized `AudioTrack`, `probeTrack()` merges by `track.id`, and probed tracks default to selected/ready. [`src/backend/ffmpeg/probe.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/ffmpeg/probe.ts:33), [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:570)
- State updates are mostly immutable and centralized in small helper functions such as `updateTrack()`, `toggleTrack()`, `markSelectedStatus()`, and `resetWorkspace()`. That makes the track panel a clear landing zone for adding drag/drop state without spreading logic across the app. [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:959)
- Styling uses CSS variables, a light theme, and panel/card primitives. Track cards already have an `active` state, so a drag-over affordance would fit naturally as a new modifier class on the existing panel or card structure. [`src/frontend/styles/app.css`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/styles/app.css:1), [`src/frontend/styles/app.css`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/styles/app.css:75)

## 4. Integration Points
### In-Scope
- [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:143), [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:414), [`src/frontend/main.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/main.ts:942) - Track panel rendering, DOM event delegation, and the `probeTrack()`/dedupe/reset path. This is the primary landing zone for a drop target, drag-over state, file filtering, partial-success messaging, and preserving the existing manual path probe workflow.
- [`src/frontend/styles/app.css`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/styles/app.css:228) - Track card styling and active-state treatment. Add drag-over / rejection / partial-success visuals here so the new interaction matches the current panel/card language.
- [`src/backend/ffmpeg/probe.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/ffmpeg/probe.ts:33) - Existing ffprobe-to-`AudioTrack` mapping and stable track identity. Dropped tracks should reuse this path so metadata, default selection, and duplicate handling stay identical to manual probing.
- [`src/frontend/api/client.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/frontend/api/client.ts:24) - Current probe API gateway. If drag/drop is implemented as a frontend-to-backend bridge, this client is where new file-loading/probe calls would likely fan out.
- [`tests/frontend/api-client.test.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/tests/frontend/api-client.test.ts:1) and [`tests/backend/probe.test.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/tests/backend/probe.test.ts:5) - Existing test style to extend with drag/drop behavior, rejection cases, and regression coverage for existing probe semantics.

### Out-of-Scope
- [`src/backend/transcript/jsonl.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/transcript/jsonl.ts:27) - Transcript JSONL parsing and HTML export do not participate in M4A drag/drop selection.
- [`src/backend/ffmpeg/commands.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/ffmpeg/commands.ts:14) and [`src/backend/ffmpeg/runner.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/ffmpeg/runner.ts:1) - FFmpeg processing-plan generation and execution are separate from track loading.
- [`src/backend/session/manifest.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/backend/session/manifest.ts:9) - Session persistence is not required for the requested drop workflow unless a later design explicitly saves drop state.
- [`src/shared/time/format.ts`](/Users/giorgosmarinos/Documents/sync-transcript-studio/src/shared/time/format.ts:1) - Timestamp helpers are unrelated unless track display formatting changes as a side effect.

### New Integration Points
- Browser drag-and-drop to track loading is not present today. The current UI only accepts manual absolute paths, so the requested drop target is a new frontend integration surface that should live around `renderTrackPanel()` and the existing track action flow in `src/frontend/main.ts`.
- If the chosen implementation cannot derive usable local paths directly from dropped files, the app will need a new local-only staging or upload bridge. The current backend only exposes path-based probe/media routes, so the likely landing location for that bridge would be a new endpoint in `src/backend/server/index.ts` plus matching frontend plumbing.

## 5. Notes
- I did not find any existing drag/drop handlers or `DataTransfer` handling in the sampled frontend files, so this looks like a new feature surface rather than a partial implementation.
- The track probe code already gives you the right identity model for avoiding duplicates: `stableTrackId(path)` hashes the path, and `probeTrack()` replaces an existing track with the same id instead of adding a second copy.
- Test coverage exists for API-client behavior, ffprobe mapping, transcript parsing, manifest persistence, and FFmpeg command construction, but there is no direct coverage of the `main.ts` track panel event flow yet.
