# Plan 011: Multi-Provider M4A Transcription

## Provenance

- Refined request: `docs/reference/refined-request-multi-provider-m4a-transcription.md`
- Investigation: `docs/reference/investigation-multi-provider-m4a-transcription.md`
- Technical research:
  - `docs/research/soniox-stt-api.md`
  - `docs/research/elevenlabs-speech-to-text-api.md`
  - `docs/research/apple-local-speech-transcription.md`
- Codebase scan: `docs/reference/codebase-scan-multi-provider-m4a-transcription.md`
- Proposal: `docs/design/proposal-multi-provider-m4a-transcription.md`

## Objective

Implement Transcript Studio transcription support for Soniox API, Apple local speech transcription, and ElevenLabs API across CLI and Electron UI, producing canonical JSONL and provider-native JSON next to each source M4A file.

## Files to Modify

- `src/shared/types.ts`
- `src/backend/server/index.ts`
- `src/backend/transcript/jsonl.ts`
- `src/backend/session/manifest.ts`
- `src/cli/args.ts`
- `src/cli/index.ts`
- `src/frontend/api/client.ts`
- `src/frontend/main.ts`
- `src/frontend/styles/app.css`
- `docs/tools/transcript-studio.md`
- `README.md`
- `docs/design/project-design.md`
- `docs/design/project-functions.MD`

## Files to Add

- `src/backend/transcription/providers.ts`
- `src/backend/transcription/config.ts`
- `src/backend/transcription/jobs.ts`
- `src/backend/transcription/output.ts`
- `src/backend/transcription/normalize.ts`
- `src/backend/transcription/providers/soniox.ts`
- `src/backend/transcription/providers/elevenlabs.ts`
- `src/backend/transcription/providers/apple-local.ts`
- `src/native/apple-transcriber/`
- `tests/backend/transcription-*.test.ts`
- `tests/cli/transcribe-args.test.ts`
- `tests/frontend/transcription-*.test.ts`

## Phases

1. Provider-neutral foundation: shared types, config, provider registry, output path planning, and planning endpoint.
2. Soniox adapter: upload/create/poll/fetch/normalize and tests.
3. ElevenLabs adapter: multipart convert/normalize and tests.
4. Apple local adapter: macOS native helper, TypeScript wrapper, platform checks, and tests.
5. CLI support: `transcribe` command, batch/session inputs, provider override, consent flag, output reporting.
6. UI support: provider selector, scope selector, consent controls, job status, and load generated transcript.
7. Documentation and validation: README/tool docs/design/functions updates, typecheck, tests, audit.

## Acceptance Criteria

- CLI and Electron UI can initiate transcription jobs through the same backend service.
- Single-file, batch, and session workflows are supported.
- Soniox, Apple local, and ElevenLabs providers are registered and capability-reported.
- External API providers require explicit upload confirmation.
- Missing configuration and provider failures produce explicit errors.
- Canonical JSONL and provider-native JSON are saved next to each source M4A file without overwriting existing files.
- Generated canonical JSONL can be loaded by the existing transcript view.
- Tests cover config validation, provider planning, output naming, normalization, CLI parsing, and UI consent/status behavior.

## Risks

- Apple SpeechTranscriber availability depends on macOS version and installed speech models.
- Provider account limits and model availability can change.
- Long audio files may require asynchronous job handling for all providers, even if one provider has a synchronous endpoint.
- Speaker diarization is not confirmed for Apple local transcription.
