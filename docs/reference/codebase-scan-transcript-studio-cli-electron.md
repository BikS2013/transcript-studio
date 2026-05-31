---
language: TypeScript
framework: "Node.js HTTP backend, Vite browser frontend"
package_manager: npm
build_command: "npm run build"
test_command: "npm test"
lint_command: null
entry_points:
  - "src/backend/server/index.ts"
  - "src/frontend/main.ts"
  - "index.html"
  - "package.json"
last_scanned_commit: null
request_file: "docs/reference/refined-request-transcript-studio-cli-electron.md"
scan_scope: "Rename active project identity to Transcript Studio, add first-class CLI command, and add Electron desktop UI entry point."
generated_at: "2026-05-31T00:00:00+03:00"
---

# Codebase Scan: Transcript Studio CLI and Electron

## Metadata

- Project root: `/Users/giorgosmarinos/Documents/sync-transcript-studio`
- Request-driven narrowing: yes
- VCS note: `last_scanned_commit` is `null` because project instructions prohibit version-control operations unless explicitly requested.
- Existing package name: `sync-transcript-studio`
- Existing package binary: `sync-transcript-studio`
- Current build command: `npm run build`
- Current test command: `npm test`
- Current audit command: `npm run audit`

## Module Map

### Package and Build

- `package.json`
  - Defines the npm package name, scripts, dependencies, and existing bin entry.
  - Current name is `sync-transcript-studio`.
  - Current bin points directly to `./dist/backend/backend/server/index.js`.
  - Current scripts build backend with TypeScript and frontend with Vite.

- `tsconfig.backend.json`
  - Compiles `src/backend/**/*.ts` and `src/shared/**/*.ts` to `dist/backend`.
  - Uses `NodeNext` module resolution and emits declarations.

- `tsconfig.frontend.json`
  - Typechecks `src/frontend/**/*.ts`, `src/shared/**/*.ts`, and `vite.config.ts`.
  - Uses DOM libraries and Vite client types with no emit.

- `vite.config.ts`
  - Builds `index.html` into `dist/frontend`.
  - Uses no public directory.

### Backend

- `src/backend/server/index.ts`
  - Existing HTTP backend and current CLI/server entry.
  - Exposes health, probe, dropped media/transcript staging, transcript loading/export, FFmpeg planning/running, and byte-range media streaming routes.
  - Uses `startServer(port = portFromArgs(process.argv))` and logs `Sync Transcript Studio listening at ...`.
  - Serves static frontend files from `dist/frontend` relative to `process.cwd()`.

- `src/backend/config/prerequisites.ts`
  - Checks `ffmpeg` and `ffprobe` availability through executable-plus-argument calls.
  - Raises `MissingPrerequisiteError` when a required executable is not available.
  - Current executable names are constants, not user-configurable paths.

- `src/backend/ffmpeg/*.ts`
  - Builds and runs FFmpeg commands using executable and argument arrays.
  - Enforces collision safety before writing derived outputs.

- `src/backend/media/drop.ts`
  - Stages browser-selected M4A and JSONL files into app-managed local staging paths.
  - Supports the existing local-first drag/drop bridge.

- `src/backend/transcript/jsonl.ts`
  - Parses JSONL transcript files, normalizes transcript bundles, and exports transcript HTML.

### Frontend

- `index.html`
  - Vite HTML entry point.
  - Current document title is `Sync Transcript Studio`.

- `src/frontend/main.ts`
  - Main browser UI.
  - Current visible brand is `Sync Transcript Studio`.
  - Maintains application state, layout, track/transcript controls, processing controls, and playback behavior.

- `src/frontend/api/client.ts`
  - Browser API client for backend routes.
  - Should remain the shared API path for browser and Electron renderer use.

- `src/frontend/drop/*.ts`
  - Classifies M4A and JSONL file selections.

- `src/frontend/layout/resize.ts`
  - Bounded panel resize helper.

- `src/frontend/styles/app.css`
  - Full workspace styling.

### Tests

- `tests/backend/*.test.ts`
  - Cover dropped media staging, FFmpeg command construction, probing, session manifest behavior, and transcript JSONL handling.

- `tests/frontend/*.test.ts`
  - Cover frontend API client, dropped file classification, and resizable panels.

- `tests/shared/*.test.ts`
  - Cover shared time formatting utilities.

## Conventions Observed

- TypeScript source uses ESM imports and explicit `.js` extensions for backend/shared runtime imports.
- Frontend imports omit file extensions and are bundled by Vite.
- Backend routes return structured JSON errors with explicit messages.
- FFmpeg and ffprobe commands use `execFile` or executable-plus-argument arrays rather than shell-interpolated strings.
- Tests use Vitest and Node temporary directories for isolated filesystem cases.
- Source audio/transcript files are treated as immutable; generated outputs require collision checks.
- Documentation artifacts live under `docs/design`, `docs/reference`, `docs/research`, and `docs/tools`.

## Integration Points

### In Scope

- `package.json`
  - Rename package to `transcript-studio`.
  - Replace or update bin command to `transcript-studio`.
  - Add scripts for CLI and Electron validation.
  - Add vetted Electron dependency if Electron is implemented in this slice.

- `package-lock.json`
  - Regenerate after dependency or package metadata changes.

- `src/backend/server/index.ts`
  - Update active branding in startup output.
  - Refactor startup so the CLI and Electron wrapper can start the backend without accidental duplicate autostart behavior.
  - Preserve existing API route behavior.

- `src/frontend/main.ts`
  - Update visible product brand to `Transcript Studio`.

- `index.html`
  - Update document title to `Transcript Studio`.

- New `src/cli/` integration point
  - Add a first-class CLI entry that supports at least launching the local workspace with documented flags/help.
  - Should call existing backend startup behavior rather than duplicating server logic.

- New `src/electron/` integration point
  - Add an Electron main process that opens the existing built frontend and coordinates with the local backend.
  - Should not duplicate frontend or processing logic.

- `tsconfig.backend.json`
  - Include new CLI/Electron TypeScript files in backend/runtime compilation.

- `tests/`
  - Add focused tests for CLI argument parsing/help behavior and any pure Electron helper logic that can run without launching a GUI.

- `README.md`
  - Update product name, command examples, and Electron usage.

- `AGENTS.md`
  - Update project context and concise tool reference from Sync Transcript Studio to Transcript Studio.

- `docs/tools/`
  - Add or rename dedicated tool documentation to `docs/tools/transcript-studio.md`.
  - Keep `AGENTS.md` pointing at the dedicated tool documentation.

- `docs/design/project-design.md`
  - Record rename, CLI, and Electron design decisions.

- `docs/design/project-functions.MD`
  - Register CLI and Electron app functional requirements.

- `Issues - Pending Items.md`
  - Document the issue and solution, plus dependency vetting results.

### Out of Scope

- Core FFmpeg command behavior in `src/backend/ffmpeg/*.ts`, except for imports or branding references if discovered.
- Transcript parsing/normalization behavior in `src/backend/transcript/jsonl.ts`.
- Drag/drop classification logic in `src/frontend/drop/*.ts`.
- Panel resizing logic in `src/frontend/layout/resize.ts`.
- Hosted/cloud processing, authentication, database design, installer publishing, code signing, notarization, and auto-update infrastructure.

### Existing or Partial Implementation

- Partial CLI exists: `package.json` exposes a `sync-transcript-studio` binary pointing to the backend server entry.
- Existing browser UI exists: the frontend/backend app already provides the review workspace that Electron should reuse.
- Electron app is not implemented.
- Active branding still uses `Sync Transcript Studio`.

## Duplication Check

The requested feature is partially implemented only for the local web workspace and the old `sync-transcript-studio` server command. The plan should extend the current backend/frontend and package metadata rather than create a parallel application.
