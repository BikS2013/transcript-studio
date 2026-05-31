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
request_file: docs/reference/refined-request-transcript-drop-local-file-picker.md
scan_scope: sync-transcript-studio
generated_at: 2026-05-31T13:00:00Z
---

# Codebase Scan: Transcript Drop and Local File Picker Selection

## Module Map

- `sync-transcript-studio/src/backend/server/index.ts` exposes local HTTP routes for health, audio probe, transcript load/export, processing, media streaming, static serving, and the current dropped M4A staging endpoint.
- `sync-transcript-studio/src/backend/media/drop.ts` stages dropped M4A request bodies into `.sync-transcript-studio/dropped-media/` with content-hash filenames.
- `sync-transcript-studio/src/backend/transcript/jsonl.ts` parses one or more JSONL paths into a canonical `TranscriptBundle`; the server already accepts `path` or `paths` through `requestPaths()`.
- `sync-transcript-studio/src/frontend/main.ts` renders the Tracks and Transcript panels, owns drag/drop event delegation, manual path probing/loading, and status/error state.
- `sync-transcript-studio/src/frontend/api/client.ts` wraps frontend calls to backend JSON and dropped-media endpoints.
- `sync-transcript-studio/src/frontend/drop/m4a.ts` classifies dropped M4A files for the current drag/drop flow.
- `sync-transcript-studio/src/shared/types.ts` contains shared DTOs for tracks, transcripts, processing, health, and staged dropped media.

## Conventions

- Local frontend imports use ESM syntax with `.js` emitted paths in tests and extensionless paths in browser source.
- Backend route failures become JSON `{ error }` responses, while frontend actions catch exceptions into `state.errorMessage`.
- Browser file inputs and drag/drop cannot provide absolute paths, so locally selected files must be staged through a backend endpoint before probing/parsing.
- Existing track dedupe depends on content-hash staged filenames plus stable track IDs from backend paths.
- Styling uses panel primitives and `.drop-target` classes, so transcript drop support should reuse those styles.

## Integration Points

### In Scope

- `src/backend/media/drop.ts` - generalize staging so M4A and JSONL can share content-hash storage behavior with type-specific folders/extensions.
- `src/backend/server/index.ts` - add a dropped-transcript endpoint and keep dropped-media behavior intact.
- `src/frontend/api/client.ts` - add dropped transcript upload and multi-path transcript load support.
- `src/frontend/main.ts` - add transcript drop state, hidden file inputs, Browse buttons, transcript drop handlers, and selected-file handlers.
- `src/frontend/drop/` - add JSONL classification alongside the existing M4A classification.
- `tests/backend/dropped-media.test.ts`, `tests/frontend/api-client.test.ts`, and frontend drop classification tests - extend focused coverage.

### Out of Scope

- `src/backend/ffmpeg/*` - no FFmpeg command changes are needed.
- `src/backend/session/manifest.ts` - session persistence is not required for file selection.
- `src/shared/time/*` - timestamp formatting is unaffected.

## Duplication Check

Partial implementation exists for M4A drag/drop and staging. The correct plan is to extend that implementation rather than create a parallel uploader. Transcript drag/drop and file-picker controls are not currently implemented.
