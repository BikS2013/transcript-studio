# Soniox STT API Research

Research date: 2026-05-31

## Sources

- Soniox API reference: https://soniox.com/docs/api-reference
- Soniox OpenAPI specification: https://soniox.com/docs/openapi.yaml

## Relevant Capabilities

- Soniox exposes an async transcription workflow under `/v1/transcriptions`.
- Audio can be supplied through an uploaded file ID or an audio URL.
- `CreateTranscriptionPayload` requires a `model` and supports `language_hints`, `language_hints_strict`, `enable_speaker_diarization`, `enable_language_identification`, `context`, webhook fields, and client reference metadata.
- Transcript results include detailed tokens with `text`, `start_ms`, `end_ms`, `confidence`, optional `speaker`, optional `language`, and optional audio-event metadata.
- Transcription status and transcript retrieval are separate operations, so Transcript Studio should model Soniox jobs as asynchronous with polling and explicit terminal states.

## Proposal Implications

- Use a Soniox provider adapter that:
  - Uploads local M4A files through `/v1/files`.
  - Creates transcriptions with `file_id`.
  - Polls `/v1/transcriptions/{transcription_id}` until completed or failed.
  - Retrieves `/v1/transcriptions/{transcription_id}/transcript`.
  - Preserves the full Soniox transcript response as provider-native JSON.
  - Converts token runs into canonical Transcript Studio JSONL segments.
- Use `enable_speaker_diarization: true` and `enable_language_identification: true` when the user requests the default full-feature mode.
- Map Soniox API errors directly to explicit user-facing errors. Do not retry with another provider unless the user starts a new job with a different provider.

## Open Items

- Confirm the preferred Soniox model ID for production use during implementation, because model availability may vary by account and date.
- Confirm whether uploaded Soniox files should be deleted after transcript retrieval or retained for audit/debug purposes.
