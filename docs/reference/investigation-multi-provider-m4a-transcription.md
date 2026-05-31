# Investigation: Multi-Provider M4A Transcription

## Executive Summary

Transcript Studio should implement transcription through a provider abstraction rather than provider-specific UI and CLI flows. The recommended approach is a shared backend transcription service with three adapters: Soniox API, ElevenLabs API, and Apple local speech transcription through a macOS native helper. This keeps the existing CLI and Electron UI aligned, preserves local-first behavior where possible, and lets provider capability differences be surfaced explicitly.

## Context

- Refined request: `docs/reference/refined-request-multi-provider-m4a-transcription.md`
- Codebase scan: `docs/reference/codebase-scan-multi-provider-m4a-transcription.md`
- Research:
  - `docs/research/soniox-stt-api.md`
  - `docs/research/elevenlabs-speech-to-text-api.md`
  - `docs/research/apple-local-speech-transcription.md`

Transcript Studio already supports M4A loading, JSONL transcript import, transcript presentation, local media streaming, and non-destructive derived exports. The missing layer is transcription generation.

## Options Identified

### Option A: Provider Abstraction in Backend

Add a backend transcription domain with provider adapters, shared job orchestration, output generation, and a common API for both CLI and Electron UI.

Pros:

- Reuses the existing backend architecture.
- Keeps CLI and Electron behavior consistent.
- Avoids duplicated provider logic in frontend and CLI.
- Supports capability reporting per provider.
- Enables shared tests for output naming, config validation, normalization, and errors.

Cons:

- Requires several new backend modules.
- Apple local transcription still needs a native helper.

### Option B: UI-First Provider Integrations

Implement provider calls from the frontend or Electron-specific surface.

Pros:

- Faster visual prototype for API providers.

Cons:

- Exposes API-key handling to frontend concerns.
- Does not serve CLI equally.
- Duplicates behavior between Electron and browser workspace.
- Does not fit the current backend-owned processing pattern.

### Option C: Separate External Transcription Tool

Create a separate CLI or script that transcribes M4A files and leaves Transcript Studio to import generated JSONL files.

Pros:

- Lower coupling to the current app.
- Could be useful as a standalone utility.

Cons:

- User requested Transcript Studio support, not an external tool.
- Would fragment configuration, session tracking, and UI status.
- Would not provide integrated batch/session workflows.

## Comparison Matrix

| Criteria | Option A: Backend abstraction | Option B: UI-first | Option C: External tool |
| --- | --- | --- | --- |
| CLI support | Strong | Weak | Strong but separate |
| Electron support | Strong | Strong | Weak |
| Shared config validation | Strong | Weak | Medium |
| Provider capability reporting | Strong | Medium | Medium |
| Privacy/consent controls | Strong | Medium | Weak |
| Reuse existing JSONL pipeline | Strong | Medium | Medium |
| Long-term maintainability | Strong | Weak | Medium |
| Implementation complexity | Medium | Medium | Low to medium |

## Recommendation

Use Option A: a backend transcription provider abstraction, shared by CLI and Electron UI.

Recommended module boundaries:

- `src/backend/transcription/providers.ts`
- `src/backend/transcription/config.ts`
- `src/backend/transcription/jobs.ts`
- `src/backend/transcription/output.ts`
- `src/backend/transcription/normalize.ts`
- `src/backend/transcription/providers/soniox.ts`
- `src/backend/transcription/providers/elevenlabs.ts`
- `src/backend/transcription/providers/apple-local.ts`
- `src/native/apple-transcriber/`

## Technical Research Guidance

Research needed: completed for proposal.

Research files:

- `docs/research/soniox-stt-api.md`
- `docs/research/elevenlabs-speech-to-text-api.md`
- `docs/research/apple-local-speech-transcription.md`

Further implementation-time validation:

- Confirm exact Soniox production model ID available to the user's account.
- Confirm ElevenLabs synchronous request behavior and account limits for long M4A files.
- Validate Apple SpeechTranscriber availability on the user's target macOS version.
- Confirm whether M4A needs conversion before Apple SpeechAnalyzer ingestion.

## Implementation Considerations

- Do not make Soniox the default just because it was listed first.
- Require `TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER` for jobs where the user does not explicitly choose a provider.
- External API providers must show/upload consent. Apple local must not upload audio.
- Missing API keys, missing expiration metadata, unsupported platform, unsupported provider capability, or failed provider calls must produce explicit errors.
- Preserve provider-native JSON exactly enough to support later debugging and provider-specific re-normalization.
- Generate canonical JSONL for immediate use by the existing transcript loader.

## References

- Soniox API reference: https://soniox.com/docs/api-reference
- Soniox OpenAPI specification: https://soniox.com/docs/openapi.yaml
- ElevenLabs create transcript API reference: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
- ElevenLabs STT overview: https://elevenlabs.io/docs/overview/capabilities/speech-to-text
- Apple Speech framework: https://developer.apple.com/documentation/speech
- Apple SpeechAnalyzer: https://developer.apple.com/documentation/speech/speechanalyzer
- Apple SpeechTranscriber: https://docs.developer.apple.com/tutorials/data/documentation/speech/speechtranscriber.md

## Original Request

Prepare Transcript Studio to support Soniox API, Apple local SDK, and ElevenLabs API transcription for M4A files, then prepare a full proposal covering both CLI and Electron UI, single/batch/session workflows, configured default provider with user override, explicit failures, external upload consent, canonical and provider-native outputs, required STT metadata, standard configuration with expiration fields, Apple support for CLI and Electron, output next to audio files, and no implied provider priority.
