---
language: TypeScript
framework: Node.js backend, Vite frontend, Electron desktop shell
package_manager: npm
build_command: npm run build
test_command: npm test
lint_command: none documented
entry_points:
  - src/cli/index.ts
  - src/backend/server/index.ts
  - src/electron/main.ts
  - src/frontend/main.ts
last_scanned_commit: not captured; version-control commands are not permitted without explicit user request
scanned_for_request: refined-request-multi-provider-m4a-transcription
scanned_at: 2026-05-31
---

# Codebase Scan: Multi-Provider M4A Transcription

## Summary

Transcript Studio is already structured around a shared TypeScript model, a Node.js HTTP backend, a browser/Electron frontend, and non-destructive derived outputs. Multi-provider M4A transcription should extend these existing surfaces instead of creating a parallel application.

No existing transcription-generation provider is implemented. The current transcript capability is JSONL import, normalization, rendering, navigation, and HTML export.

## Module Map

- `src/shared/types.ts`: Shared data contracts for tracks, transcript bundles, processing plans, derived outputs, health status, and session manifests.
- `src/backend/server/index.ts`: Local HTTP API router. Current endpoints cover health, probing, dropped media/transcript staging, transcript load/export, FFmpeg planning/execution, media streaming, and static frontend serving.
- `src/backend/transcript/jsonl.ts`: Existing canonical transcript JSONL parser, normalizer, paragraph grouper, and HTML exporter.
- `src/backend/session/manifest.ts`: Session manifest creation, load/save, and derived output registration.
- `src/backend/config/prerequisites.ts`: Executable prerequisite checks for FFmpeg and ffprobe.
- `src/backend/media/drop.ts`: Local staging for dropped M4A and JSONL files.
- `src/cli/args.ts`: CLI action and option parser for `start`, `ui`, `--port`, `--help`, and `--version`.
- `src/cli/index.ts`: CLI launcher for the backend and Electron app.
- `src/electron/main.ts`: Electron main process that starts the same backend and opens the workspace URL.
- `src/frontend/api/client.ts`: Browser API client for backend endpoints.
- `src/frontend/main.ts`: Main UI state, rendering, event handling, playback, transcript loading, and processing/export controls.
- `tests/`: Vitest tests cover CLI args, Electron config, backend transcript/session/probe/FFmpeg behavior, frontend API/drop behavior, and panel resizing.

## Integration Points

### In Scope

- `src/shared/types.ts`: Add transcription provider IDs, capability metadata, job request/status/result types, output metadata, canonical segment confidence fields, and provider-native sidecar metadata.
- `src/backend/server/index.ts`: Add endpoints for transcription config/capabilities, transcription plan/start/status, and transcript output loading after generation.
- `src/backend/transcript/jsonl.ts`: Keep existing JSONL import behavior, and add or share canonical JSONL writing helpers for provider-normalized segments.
- `src/backend/session/manifest.ts`: Extend derived outputs or add transcription outputs so generated canonical JSONL and provider-native JSON are tracked without overwriting source files.
- `src/backend/config/`: Add explicit transcription configuration loading and validation with the standard project precedence chain and no missing-value fallbacks.
- `src/backend/transcription/`: New module boundary for provider abstraction, Soniox API adapter, ElevenLabs API adapter, Apple local adapter, output naming, canonical normalization, and job orchestration.
- `src/cli/args.ts` and `src/cli/index.ts`: Add `transcribe` command support for single file, multiple files, session scope, provider override, language hints, and output reporting.
- `src/electron/main.ts`: Support Apple local transcription prerequisites and native helper invocation from the backend used by Electron.
- `src/frontend/api/client.ts`: Add transcription API methods and typed error handling.
- `src/frontend/main.ts` and `src/frontend/styles/app.css`: Add transcription controls to the workspace, likely as a dedicated panel section near Processing or Transcript.
- `tests/backend/`: Add provider abstraction, config validation, output naming, adapter normalization, and endpoint tests.
- `tests/cli/`: Add `transcribe` command parsing tests.
- `tests/frontend/`: Add UI/client tests for provider selection, status rendering, consent messaging, and error handling.

### Out of Scope

- `src/backend/ffmpeg/*`: Reuse for optional future audio conversion only. Do not place STT provider logic inside FFmpeg modules.
- `src/backend/media/drop.ts`: Reuse staged M4A paths, but do not add provider API calls here.
- Existing playback synchronization code in `src/frontend/main.ts`: Keep behavior unchanged except for loading newly generated transcript files.

### New Integration Points

- `src/backend/transcription/providers.ts`: Provider interface, capability map, and registry.
- `src/backend/transcription/config.ts`: Configuration resolution, required-key validation, expiration-date parsing, and warnings.
- `src/backend/transcription/jobs.ts`: Job orchestration, status transitions, output path planning, and explicit error handling.
- `src/backend/transcription/output.ts`: Non-destructive output path generation and collision checks.
- `src/backend/transcription/normalize.ts`: Provider-native result to canonical Transcript Studio JSONL conversion.
- `src/backend/transcription/providers/soniox.ts`: Soniox upload/create/poll/fetch adapter.
- `src/backend/transcription/providers/elevenlabs.ts`: ElevenLabs multipart STT adapter.
- `src/backend/transcription/providers/apple-local.ts`: TypeScript wrapper around a macOS native Apple Speech helper.
- `src/native/apple-transcriber/`: Proposed Swift helper for Apple Speech framework integration, built only on macOS.

## Existing Behavior Relevant to Duplication Check

- JSONL transcript loading and normalization is already implemented in `src/backend/transcript/jsonl.ts`; the transcription feature should output compatible JSONL and then reuse this path.
- Derived-output collision prevention already exists through `assertOutputDoesNotExist` in `src/backend/ffmpeg/commands.ts`; transcription output generation should reuse or extract this behavior.
- Session manifests already track derived outputs. The new feature should extend this model instead of creating an unrelated output registry.

## Build and Test Notes

- Build command: `npm run build`.
- Typecheck command: `npm run typecheck`.
- Test command: `npm test`.
- Audit command: `npm audit`.
- New runtime dependencies require advisory vetting before manifest changes.
