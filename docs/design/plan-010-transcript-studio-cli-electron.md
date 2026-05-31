# Plan 010: Transcript Studio CLI and Electron

## Provenance

- Refined request: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-transcript-studio-cli-electron.md`
- Investigation: skipped because the project already has an accepted local TypeScript browser workspace architecture, and Electron can reuse that workspace rather than introduce a new product architecture.
- Technical research: skipped because no unfamiliar implementation pattern is required; Electron package/version vetting is handled through dependency validation before manifest changes.
- Codebase scan: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/codebase-scan-transcript-studio-cli-electron.md`

## Objective

Rename the active project identity to Transcript Studio, expose a documented `transcript-studio` CLI command, and add a locally runnable Electron desktop app that reuses the existing backend/frontend workspace.

## Files to Modify

- `package.json` - rename package, update bin, add Electron scripts, and add vetted Electron dependency.
- `package-lock.json` - regenerate after package metadata and dependency changes.
- `tsconfig.backend.json` - include CLI and Electron runtime entry points in the backend build.
- `src/backend/server/index.ts` - update active branding and refactor server startup for reuse by CLI and Electron.
- `src/cli/index.ts` - new first-class CLI entry point for help/version/start behavior.
- `src/electron/main.ts` - new Electron main process that starts the backend and opens the local workspace.
- `src/frontend/main.ts` and `index.html` - update visible UI brand/title to Transcript Studio.
- `tests/cli/` and `tests/electron/` - add focused tests for CLI parsing/help and Electron helper behavior without launching a GUI.
- `README.md` - document CLI and Electron usage.
- `AGENTS.md` - update the concise tool reference and project context.
- `docs/tools/transcript-studio.md` - dedicated tool documentation for the renamed tool.
- `docs/tools/sync-transcript-studio.md` - remove or supersede old active documentation if no longer referenced.
- `docs/design/project-design.md` - record the rename, CLI, and Electron design decision.
- `docs/design/project-functions.MD` - register CLI and Electron functional requirements.
- `Issues - Pending Items.md` - document the issue/solution and dependency vetting log.

## Implementation Notes

- Make `Transcript Studio` the active product display name and `transcript-studio` the package, binary, and documentation slug.
- Do not keep a legacy `sync-transcript-studio` binary in this slice; the user asked to rename the project, and active tool references should use one canonical command.
- Keep the existing browser-served workspace usable through `npm start`.
- Implement the CLI in TypeScript and let it start the existing backend. Support `--help`, `--version`, `--port <number>`, and `start`.
- Preserve explicit error behavior for invalid CLI flags and missing frontend builds.
- Add Electron as a development dependency after vetting. The Electron main process should start the same local backend and load `http://127.0.0.1:<port>`.
- Do not add installer packaging, code signing, notarization, or auto-update infrastructure in this slice.
- Do not change core FFmpeg, transcript parsing, staging, or playback behavior unless needed for naming or entry-point reuse.

## Acceptance Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run audit`
- `node dist/backend/cli/index.js --help`
- `node dist/backend/cli/index.js --version`
- `node dist/backend/cli/index.js --port 4317 --help`
- Electron smoke validation that the compiled Electron main module exposes the expected app URL/port helpers without launching a GUI.
