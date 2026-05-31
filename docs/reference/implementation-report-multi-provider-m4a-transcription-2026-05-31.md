# Implementation Report: Multi-Provider M4A Transcription

## Scope

Implemented the multi-provider transcription design from `docs/design/plan-011-multi-provider-m4a-transcription.md`.

## Provenance

- Refined request: `docs/reference/refined-request-multi-provider-m4a-transcription.md`
- Proposal: `docs/design/proposal-multi-provider-m4a-transcription.md`
- Plan: `docs/design/plan-011-multi-provider-m4a-transcription.md`
- Investigation: `docs/reference/investigation-multi-provider-m4a-transcription.md`
- Codebase scan: `docs/reference/codebase-scan-multi-provider-m4a-transcription.md`
- Research:
  - `docs/research/soniox-stt-api.md`
  - `docs/research/elevenlabs-speech-to-text-api.md`
  - `docs/research/apple-local-speech-transcription.md`

## Implemented

- Shared transcription types for providers, capabilities, plans, jobs, warnings, outputs, and segment metadata.
- Backend transcription modules for provider registry, configuration resolution, output planning, normalization, provider adapters, and in-memory job orchestration.
- Provider adapters:
  - Soniox async upload/create/poll/fetch workflow.
  - ElevenLabs multipart speech-to-text workflow.
  - Apple local wrapper that runs a configured macOS helper executable.
- Canonical JSONL writing and provider-native JSON preservation next to each source M4A.
- Backend API endpoints:
  - `GET /api/transcription/providers`
  - `POST /api/transcription/plan`
  - `POST /api/transcription/jobs`
  - `GET /api/transcription/jobs`
  - `GET /api/transcription/jobs/:id`
- CLI `transcribe` command for one or more `--input` files or a session manifest.
- Electron/browser UI transcription controls in the Processing panel, including provider selection, scope, language/model fields, diarization, capability-gap strictness, external-upload consent, planning, job start, status refresh, and generated JSONL loading.
- Apple helper source scaffold under `src/native/apple-transcriber/`.

## Configuration

- `TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER`
- `SONIOX_API_KEY`
- `SONIOX_API_KEY_EXPIRES_AT`
- `SONIOX_STT_MODEL`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_API_KEY_EXPIRES_AT`
- `ELEVENLABS_STT_MODEL`
- `TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE`
- `TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH`

Configuration values resolve in this order, lowest to highest: shell environment, `~/.tool-agents/transcript-studio/.env`, project `.env`, explicit code or CLI overrides.

## Verification

- `npm run typecheck` passed.
- `npm test` passed: 18 test files, 59 tests.
- `npm run build` passed.
- `npm audit` passed with 0 vulnerabilities.
- `swift build` passed in `src/native/apple-transcriber`.
- Built server smoke checks passed for `/`, `/api/transcription/providers`, and an explicit missing-default-provider error from `/api/transcription/plan`.

## Remaining Operational Validation

- Real Soniox API smoke test with credentials and explicit upload consent.
- Real ElevenLabs API smoke test with credentials and explicit upload consent.
- Apple local smoke test on macOS 26+ with installed local speech assets.
