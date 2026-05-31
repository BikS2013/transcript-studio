# Plan 007: Transcript Drop and Local File Picker Selection

## Provenance

- Refined request: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-transcript-drop-local-file-picker.md`
- Investigation: skipped; this extends the established local staging pattern.
- Technical research: skipped; no new external technology or dependency is needed.
- Codebase scan: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/codebase-scan-transcript-drop-local-file-picker.md`

## Objective

Add transcript JSONL drag-and-drop plus local file-picker selection for M4A and JSONL files in Sync Transcript Studio.

## Files to Modify

- `sync-transcript-studio/src/backend/media/drop.ts` - generalize local staging for M4A and JSONL.
- `sync-transcript-studio/src/backend/server/index.ts` - add `/api/dropped-transcripts`.
- `sync-transcript-studio/src/shared/types.ts` - add a staged transcript result type.
- `sync-transcript-studio/src/frontend/api/client.ts` - add transcript upload and multi-path load calls.
- `sync-transcript-studio/src/frontend/drop/` - add shared file classification helpers.
- `sync-transcript-studio/src/frontend/main.ts` - add Browse buttons, hidden file inputs, transcript drop target, and handlers.
- `sync-transcript-studio/src/frontend/styles/app.css` - reuse/extend drop target layout if needed.
- `sync-transcript-studio/tests/` - add focused regression tests.
- `docs/design/project-design.md`, `docs/design/project-functions.MD`, and `Issues - Pending Items.md` - document the change.

## Implementation Notes

- “Upload” remains local: selected files are streamed to the local Node backend and copied into `.sync-transcript-studio/`.
- File-picker controls should use `accept` filters for `.m4a` and `.jsonl`.
- Transcript staging should support multiple JSONL files and pass their staged paths to the existing transcript loader as `paths`.

## Acceptance Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit`
