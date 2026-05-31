# Plan 006: M4A Drag-and-Drop Track Selection

## Provenance

- Refined request: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-m4a-drag-and-drop.md`
- Investigation: skipped; browser drag/drop plus the existing local backend probe path is the single obvious approach for this app.
- Technical research: skipped; no new external technology or dependency is required.
- Codebase scan: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/codebase-scan-m4a-drag-and-drop.md`

## Objective

Add drag-and-drop loading for one or more M4A files in Sync Transcript Studio while keeping the existing manual absolute-path probe workflow intact.

## Files to Modify

- `sync-transcript-studio/src/backend/server/index.ts` - add a local-only dropped-media staging endpoint.
- `sync-transcript-studio/src/backend/media/drop.ts` - add staging, validation, safe naming, and content-hash dedupe helpers.
- `sync-transcript-studio/src/frontend/api/client.ts` - add the frontend call for staging dropped files.
- `sync-transcript-studio/src/frontend/main.ts` - add drop target state, drag/drop events, file filtering, upload/probe flow, and status messages.
- `sync-transcript-studio/src/frontend/styles/app.css` - add drop target and drag-over visual states.
- `sync-transcript-studio/src/shared/types.ts` - add the dropped-media response type.
- `sync-transcript-studio/tests/` - add focused tests for dropped-media staging and API-client upload behavior.
- `docs/design/project-design.md` and `docs/design/project-functions.MD` - record the design/function update.

## Implementation Notes

- Browsers do not expose absolute local paths for dropped files to a normal web app, so dropped M4A files will be copied into an app-managed local staging folder under the running tool directory.
- The staged filename will include a content hash so dropping the same file again resolves to the same path and the existing track-id replacement behavior prevents duplicate indistinguishable tracks.
- Unsupported dropped files will be rejected before backend staging and reported in the UI while valid M4A files in the same drop continue to load.

## Acceptance Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit`
