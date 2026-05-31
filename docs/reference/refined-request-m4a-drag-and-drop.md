# Refined Request: M4A Drag-and-Drop Track Selection

## Category
Development

## Objective
Add drag-and-drop support for M4A audio files in Sync Transcript Studio so users can select and load audio tracks without manually typing absolute file paths, while preserving the existing local-first M4A probing, playback, selection, and processing behavior.

## Scope
- **In scope**:
  - Add a drag-and-drop file selection workflow for M4A audio files in the Sync Transcript Studio track-loading area.
  - Support dropping one or more M4A files in a single operation.
  - Load successfully dropped M4A files into the existing track list with the same metadata, default selection state, playback readiness, and processing eligibility as manually probed tracks.
  - Preserve the existing manual absolute-path input and Probe button workflow.
  - Provide visible drag-over, success, partial-success, and error feedback in the existing UI status/error surfaces.
  - Reject unsupported dropped files explicitly without attempting to probe or process them.
  - Add or update focused tests for drag-and-drop handling, accepted/rejected file behavior, and preservation of existing manual probing behavior.
  - Update project design/function documentation during implementation if required by project conventions.
- **Out of scope**:
  - Drag-and-drop support for transcript JSONL files.
  - Directory drag-and-drop or recursive folder scanning.
  - New audio formats beyond M4A.
  - Changes to synchronized playback, offset correction, transcript navigation, FFmpeg processing behavior, or export formats except where necessary to make dropped tracks behave like existing tracks.
  - Cloud upload, hosted processing, or any non-local storage/service integration.
  - Replacing the current local browser workspace plus Node.js backend architecture.

## Requirements
1. The Tracks panel must expose a clear drop target for M4A files that works with standard browser drag-and-drop events.
2. The drop target must accept one or more dropped files whose filename extension is `.m4a`, case-insensitively.
3. Dropped non-M4A files must be rejected with an explicit user-visible error or warning that identifies the unsupported file names or count.
4. If a drop contains both valid M4A files and unsupported files, the valid M4A files must still be loaded and the unsupported files must be reported.
5. A successful dropped M4A file must create or update an `AudioTrack` entry using the same probing and metadata path as existing manually probed tracks.
6. Dropped tracks must be selected by default unless the existing track-loading behavior is deliberately changed in a later implementation plan.
7. Dropped tracks must be usable by the existing playback controls, selected-track processing controls, mute/solo controls, offset controls, and media streaming flow.
8. Dropping the same M4A file more than once must not create duplicate indistinguishable tracks; duplicate handling must stay consistent with the existing stable track identity behavior.
9. The existing absolute-path input and Probe button must continue to work as they do now.
10. The UI must show a distinct visual state while a valid drag operation is over the drop target and must clear that state when the drag leaves or the drop completes.
11. The implementation must not overwrite, rename, move, or mutate source M4A files.
12. The implementation must remain local-first; dropped audio must not be sent to any external service.
13. Any missing prerequisite needed to load or probe dropped files must raise an explicit error rather than using a fallback configuration value.
14. No new runtime dependency may be added unless it is vetted according to the project dependency-vetting rules before being written to a manifest.
15. Package-local validation must cover the drag-and-drop behavior and must not regress existing track probing behavior.

## Constraints
- The implementation target is the existing TypeScript application under `sync-transcript-studio/`.
- The current application is a local browser workspace served by a Node.js/TypeScript backend.
- The current track workflow is path/probe based: the UI accepts an audio path, the backend probes via FFprobe, and the backend streams local media through `/api/media`.
- Source audio files and transcript files must remain non-destructive and local-only.
- Project code changes must stay inside `sync-transcript-studio/` unless documentation updates are required by project conventions.
- Test scripts, if any standalone scripts are created, must live under `test_scripts/`.
- No version control operation is part of this request.

## Acceptance Criteria
1. A user can drop two valid `.m4a` files onto the Tracks drop target and see both files loaded as track cards without typing either path manually.
2. Each dropped track displays probed metadata and can be selected, muted/soloed, offset-adjusted, and played through the existing transport controls.
3. Existing manual path entry plus Probe still loads an M4A file successfully after the drag-and-drop change.
4. Dropping only unsupported files creates no tracks and shows an explicit rejection message.
5. Dropping a mix of supported and unsupported files loads the supported M4A files and reports the rejected files.
6. Dropping an already loaded M4A file does not add a duplicate indistinguishable track.
7. The UI visibly indicates drag-over state and returns to the normal state after drop or drag leave.
8. Package-local validation passes for `npm run typecheck`, `npm test`, and `npm run build` from `sync-transcript-studio/`.
9. If package dependencies are changed, `npm run audit` from `sync-transcript-studio/` reports no high-or-above advisory blockers.

## Assumptions
- This request applies to Sync Transcript Studio, the existing M4A/transcript application under `sync-transcript-studio/`.
- "Select" means dropped M4A files should become loaded/probed tracks, not merely populate the existing text input.
- Multiple-file drag-and-drop is expected because the project already supports multiple audio tracks and the raw request refers to "files" plural.
- Manual path entry remains available as the keyboard-accessible and fallback selection workflow.
- Browser limitations around absolute local file paths will be addressed during implementation through a local-only mechanism that preserves the intended user outcome: no manual path typing for dropped M4A files.

## Open Questions
- Should dropped files be copied into an app-managed local workspace for backend probing/streaming, or should the implementation require a browser/native capability that preserves access to the original local file path?
- Should the drop target be limited to the Tracks panel, or should the entire workspace accept M4A drops and route them to track loading?

## Original Request
"I want you to support drag-and-drop operations for M4A files to make it easier for users to select them."
