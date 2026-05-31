# Issues - Pending Items

## Pending Items

### P1: Confirm default audio export strategy

- Status: pending
- Detected: 2026-05-31
- Context: FFmpeg can create mixed review files, source-separated files, or both.
- Resolution needed: Pick default export behavior and output folder convention.

### P2: Decide whether to expose full session manifest controls

- Status: pending
- Detected: 2026-05-31
- Context: Session manifest helpers exist, but full UI open/save controls are not yet exposed.
- Resolution needed: Decide whether the next implementation slice should add full session manifest open/save controls.

### P3: Decide whether to add FFmpeg job cancellation

- Status: pending
- Detected: 2026-05-31
- Context: FFmpeg job status and errors are exposed, but cancellation is not implemented yet.
- Resolution needed: Decide whether cancellation is required before additional export workflows are added.

### P4: Add Soniox API key expiration metadata

- Status: pending
- Detected: 2026-05-31
- Context: The Soniox configuration has `SONIOX_API_KEY` and `SONIOX_STT_MODEL`, but `SONIOX_API_KEY_EXPIRES_AT` is not configured. Transcript Studio currently treats this as a warning, while the tool documentation says expiration metadata is required so users can be warned before credential expiry.
- Resolution needed: Add `SONIOX_API_KEY_EXPIRES_AT` with the real credential expiration date, or decide whether non-expiring Soniox keys should be documented explicitly.

## Completed Items

### C24: Isolated transcription endpoint tests from user-level tool config

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The full test suite could read the real `~/.tool-agents/transcript-studio/.env` file during transcription endpoint tests, so changing the user-level Soniox model to `stt-async-v4` caused a test that expected its own `SONIOX_STT_MODEL=stt-async-v3` environment value to fail.
- Solution: Updated the endpoint test to isolate `HOME` to its temporary directory for the config-resolution scenario and restore it after each test, making the suite independent of user-level Transcript Studio configuration.

### C23: Resolved Soniox transcription model and token-spacing issues

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Running Soniox transcription for `recording-2026-05-14-15-59.system.m4a` initially failed during job creation because the configured `SONIOX_STT_MODEL` was `stt-rt-v4`, a real-time model, while Transcript Studio's Soniox adapter uses the async transcription workflow. After retrying with `stt-async-v4`, the generated canonical JSONL exposed a second issue: Soniox v4 token fragments use leading whitespace to mark word boundaries, but the normalizer trimmed token text and inserted spaces between every fragment, producing text such as `gu ess` and `By e`.
- Solution: Retried the Soniox job with `stt-async-v4`, updated `~/.tool-agents/transcript-studio/.env` so future Soniox CLI runs use `SONIOX_STT_MODEL=stt-async-v4`, fixed Soniox token normalization to preserve provider token spacing, added regression coverage for Soniox v4 subword tokens, rebuilt the project, and regenerated the canonical JSONL from the provider-native JSON.

### C22: Resolved Apple local transcription locale mismatch for system recording

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Running Apple local transcription for `recording-2026-05-14-15-59.system.m4a` with locale `en-US` failed because the local Apple Speech transcription assets reported installed locale identifiers with underscores, including `en_US`, and rejected the hyphenated locale form.
- Solution: Built the Apple transcription helper, inspected installed local SpeechTranscriber locales, retried the transcription with the installed `en_US` locale identifier, and verified the generated canonical JSONL and provider-native JSON outputs.

### C21: Implemented multi-provider M4A transcription

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Transcript Studio had a completed proposal for Soniox, Apple local, and ElevenLabs transcription, but no implementation for provider planning, configuration validation, job execution, CLI usage, UI controls, or output writing.
- Solution: Added the shared transcription model, backend provider registry, config validation, output planning, provider adapters, normalization, in-memory jobs, backend endpoints, `transcript-studio transcribe`, Processing-panel transcription controls, Apple helper source, docs, and focused regression tests.

### C20: Added project gitignore

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The project did not have a `.gitignore`, so generated dependencies, build outputs, local staged media/transcripts, exports, logs, caches, and editor files could be accidentally staged.
- Solution: Added a root `.gitignore` covering Node dependencies, TypeScript/Vite outputs, local Transcript Studio runtime data, generated exports, logs, environment files, Electron packaging output, and OS/editor artifacts.

### C19: Added transcript-studio UI command

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The Electron desktop app could be launched through `npm run electron`, but the canonical `transcript-studio` CLI did not yet expose a dedicated UI command.
- Solution: Added `transcript-studio ui` with optional `--port`, wired it to launch the compiled Electron main process through the installed Electron executable, updated CLI help, tests, README, tool docs, and function/design documentation.

### C18: Fixed symlinked transcript-studio CLI invocation

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Running the linked `transcript-studio` command produced no output because the CLI entry-point guard compared `import.meta.url` with `process.argv[1]` directly, which fails when npm/Homebrew invokes the command through a symlink.
- Solution: Updated the CLI entry point to compare real paths for the compiled module and invoked script path, so symlinked npm bin execution runs the CLI normally. Also made the argument parser tolerate a standalone `--` separator.

### C17: Renamed active tool to Transcript Studio and added CLI/Electron surfaces

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The project still used the old Sync Transcript Studio package, command, UI, and tool-documentation identity, and the app did not yet have a first-class `transcript-studio` CLI entry or Electron desktop entry point.
- Solution: Renamed the active package/tool identity to Transcript Studio, added the `transcript-studio` CLI parser and entry point, added an Electron main process that starts the existing local backend and opens the existing workspace, updated active tool/design/function documentation, and added focused CLI/Electron configuration tests.

### C16: Made Sync Transcript Studio self-contained

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Sync Transcript Studio's design, reference, research, tool, issue, and agent guidance documents were spread across the parent `GTF-prep-call` project, so the app was not self-described from its own root.
- Solution: Moved Sync Transcript Studio-specific documents under the app's `docs/` tree, added package-local `AGENTS.md`, created app-local `project-design.md`, `project-functions.MD`, and issue tracking, and relocated the complete app folder outside the parent project.

### C15: Added resizable Sync Transcript Studio side panels

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The left Tracks/Session sidebar and right Processing panel had fixed grid widths, limiting the user's ability to allocate more space to track controls, transcript review, or processing output.
- Solution: Added bounded resize handles for the left sidebar and right processing panel, keyboard arrow support for focused handles, responsive behavior that disables handles in stacked layouts, and focused tests for panel width clamping.

### C14: Added transcript drag/drop and local file picker selection

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Sync Transcript Studio could load transcripts only by manually typed absolute JSONL paths, and M4A drag/drop still lacked a Browse control for users who prefer searching local folders through the operating-system file picker.
- Solution: Added M4A and JSONL Browse controls, transcript JSONL drag/drop, local-only transcript staging, multi-path transcript loading, file classification for supported/unsupported selections, and regression tests for backend staging and frontend API behavior.

### C13: Clarified stale backend error for dropped M4A uploads

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: After adding the drag-and-drop frontend, a still-running old backend process could serve the new built assets but return `Not found` for the new `/api/dropped-media` endpoint. The UI then reported only `Failed dropped file(s): ... Not found`, which did not explain that the server needed to be restarted.
- Solution: Updated the frontend API client to translate the dropped-media 404 response into an explicit restart instruction: `Dropped-file upload endpoint is unavailable. Restart Sync Transcript Studio after rebuilding.` Added regression coverage for that stale-backend case.

### C12: Added drag-and-drop M4A track loading

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: Sync Transcript Studio required users to type absolute M4A paths before probing tracks, which made track selection awkward and did not support direct file drops.
- Solution: Added a Tracks-panel drop target, frontend M4A filtering with partial rejection reporting, a local-only backend dropped-media staging endpoint, content-hash staged filenames for duplicate drops, and reuse of the existing FFprobe-backed track-loading path. Verified with package-local typecheck, tests, build, and audit.

### C11: Fixed Sync Transcript Studio playback controls during playback

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: While audio was playing, the UI frequently did not respond to Pause, Resume, rewind, forward, and other transport buttons. The playback ticker rebuilt the entire app DOM on every animation frame, which could remove buttons between pointer down/up and made the interface feel unresponsive.
- Solution: Updated `src/frontend/main.ts` so the playback ticker no longer calls full `render()` continuously. It now updates only live DOM values: timecode, progress slider, progress fill, drift/status cells, and active transcript row. Verified with browser automation that two M4A tracks load, Pause/Resume/Forward clicks are accepted during the transport flow, and no action failure occurs.

### C10: Fixed Sync Transcript Studio M4A loading defects

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The browser UI could not load/probe M4A files correctly. The frontend expected `/api/probe` to return a single `ProbeResult`, but the backend returns `{ results: [...] }`; after that was fixed, loading the mic and system recordings together still showed only one track because track IDs were generated from a truncated path prefix shared by both filenames.
- Solution: Updated `src/frontend/api/client.ts` to unwrap the backend probe result array, fixed transcript HTML export payload naming at the same API boundary, and updated `src/backend/ffmpeg/probe.ts` to generate stable hashed track IDs from the full path. Added regression tests in `tests/frontend/api-client.test.ts` and `tests/backend/probe.test.ts`.

### C9: Built Sync Transcript Studio first implementation

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The synchronized audio/transcript tool needed to be implemented inside a dedicated folder without mixing source files into the existing project root.
- Solution: Built the TypeScript local web application; see `docs/reference/implementation-report-sync-transcript-studio-2026-05-31.md`. Verification passed for typecheck, build, tests, audit, API smoke checks, headless browser render, transcript HTML export, and FFmpeg run validation with generated smoke inputs.

### C8: Vetted Sync Transcript Studio dependencies

- Status: completed
- Detected: 2026-05-31
- Completed: 2026-05-31
- Issue: The Sync Transcript Studio implementation needed TypeScript, Vite, Vitest, and Node type definitions before package scaffolding.
- Solution: Dependency validation in `docs/reference/dependency-validation-sync-transcript-studio.md` found no high-or-above advisories or deprecations for `typescript@^6.0.3`, `vite@^8.0.14`, `vitest@^4.1.7`, and `@types/node@^25.9.1`; the implementation added these dev dependencies and must run a package-local audit after install.

## Dependency Vetting Log

- 2026-05-31: No dependencies were added for multi-provider M4A transcription; the implementation uses Node built-ins, native `fetch`/`FormData`, and a Swift helper source for Apple local transcription.
- 2026-05-31: Vetted and added `electron@^42.3.0` for the Transcript Studio Electron UI. npm reported `42.3.0` as the latest stable version, package metadata showed no deprecation notice, and install-time audit reported zero vulnerabilities.
- 2026-05-31: No dependencies were added for self-contained relocation; only project documents and filesystem location changed.
- 2026-05-31: No dependencies were added for resizable panel support; the implementation uses CSS grid variables and native pointer/keyboard events only.
- 2026-05-31: No dependencies were added for transcript drag/drop or local file-picker selection; the implementation uses browser file inputs, drag/drop APIs, and Node built-ins only.
- 2026-05-31: No dependencies were added for Sync Transcript Studio drag-and-drop M4A loading; the implementation uses browser drag/drop APIs and Node built-ins only.
- 2026-05-31: Vetted `typescript@^6.0.3`, `vite@^8.0.14`, `vitest@^4.1.7`, and `@types/node@^25.9.1` for Sync Transcript Studio; see `docs/reference/dependency-validation-sync-transcript-studio.md`. No high-or-above advisories or deprecations were found in the preflight validation.
