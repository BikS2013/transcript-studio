# Refined Request: Transcript Drop and Local File Picker Selection

## Category
Development

## Objective
Extend Sync Transcript Studio so users can load transcript JSONL files by drag-and-drop and can choose audio/transcript files from local folders through browser file-picker controls, while preserving the existing manual absolute-path workflows.

## Scope
- **In scope**:
  - Add transcript JSONL drag-and-drop support in the Transcript panel.
  - Add local file-picker buttons for M4A track files and JSONL transcript files.
  - Stage selected/dropped local files inside the existing local app-managed staging area so the backend can continue using path-based FFprobe and JSONL parsing.
  - Support multiple selected/dropped M4A files and one or more selected/dropped JSONL transcript files.
  - Reject unsupported selected/dropped files explicitly while still loading supported files from the same operation.
  - Preserve manual absolute-path entry for tracks and transcripts.
  - Add focused package-local tests for file classification, API staging calls, and backend staging.
  - Update project design/function/pending-items documentation.
- **Out of scope**:
  - Recursive folder import or persistent folder indexing.
  - Hosted upload, cloud storage, or external service transfer.
  - New transcript formats beyond JSONL.
  - Changes to transcript parsing semantics except wiring multiple locally staged JSONL paths through the existing loader.

## Requirements
1. The Tracks panel must expose a file-picker control for selecting one or more `.m4a` files.
2. The Transcript panel must expose a file-picker control for selecting one or more `.jsonl` files.
3. The Transcript panel must expose a visible drag-and-drop target for JSONL files.
4. Browser-selected or dropped M4A files must load through the same staging, probing, selection, playback, and dedupe path as existing dropped M4A files.
5. Browser-selected or dropped JSONL files must stage locally and then load through the existing backend transcript parser.
6. Unsupported files must be rejected with a clear message, and supported files in the same operation must still be processed.
7. Manual absolute-path entry and existing Load/Probe buttons must continue to work.
8. No source file may be overwritten, renamed, moved, or sent to an external service.
9. No new runtime dependency may be added unless dependency vetting is completed first.

## Constraints
- The implementation target is `sync-transcript-studio/`.
- The browser cannot expose absolute local paths from file picker or drag/drop, so local staging is required for these workflows.
- Configuration values must fail explicitly when missing; no fallback configuration behavior is introduced.
- Validation must include `npm run typecheck`, `npm test`, `npm run build`, and `npm audit`.

## Acceptance Criteria
1. A user can click a Tracks browse button, choose one or more `.m4a` files, and see them loaded as track cards.
2. A user can click a Transcript browse button, choose one or more `.jsonl` files, and see transcript paragraphs loaded.
3. A user can drag one or more `.jsonl` files onto the Transcript panel drop target and see transcript paragraphs loaded.
4. Mixed supported/unsupported selections load supported files and report rejected files.
5. Manual audio path Probe and manual JSONL path Load still work.
6. Package-local typecheck, tests, build, and audit pass.

## Assumptions
- “Transcript drop down capability” means transcript drag-and-drop capability, matching the earlier M4A drag-and-drop feature.
- “Search and upload files from local folders” means browser file-picker selection where users can browse/search local folders in the operating-system picker. Files remain local and are staged into the app; there is no external upload.
- JSONL is the only transcript format in scope.

## Open Questions
- Should a future version support whole-folder selection and recursive filtering? This implementation does not.

## Original Request
“I want you to add the transcript drop down capability, 
and the option to search and "upload" files from local folders”
