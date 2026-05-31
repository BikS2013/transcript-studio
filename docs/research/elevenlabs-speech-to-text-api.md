# ElevenLabs Speech-to-Text API Research

Research date: 2026-05-31

## Sources

- ElevenLabs speech-to-text overview: https://elevenlabs.io/docs/overview/capabilities/speech-to-text
- ElevenLabs create transcript API reference: https://elevenlabs.io/docs/api-reference/speech-to-text/convert

## Relevant Capabilities

- ElevenLabs exposes `POST /v1/speech-to-text` as a multipart form-data endpoint.
- The request requires `model_id` and accepts an uploaded file or external storage URL.
- Relevant request controls include `language_code`, `num_speakers`, `timestamps_granularity`, `diarize`, `diarization_threshold`, `use_multi_channel`, `tag_audio_events`, and webhook fields.
- Language can be predicted automatically when `language_code` is omitted.
- Speaker diarization is controlled through `diarize`, and `num_speakers` can guide maximum speaker count.
- Returned data includes detected `language_code`, `language_probability`, and word timing entries with optional speaker identity and confidence.

## Proposal Implications

- Use a synchronous ElevenLabs provider first for local files because it aligns with the existing backend request/response model.
- Preserve the complete ElevenLabs response as provider-native JSON.
- Convert words into segment-level canonical JSONL by grouping contiguous words by speaker, language, and time gap.
- Request full-feature behavior with:
  - `model_id` configured, default example `scribe_v2`.
  - `diarize: true`.
  - `timestamps_granularity: "word"` to support accurate segment construction.
  - `language_code` omitted unless the user supplies language hints, so detection remains available.
- Keep webhook support out of the first implementation phase unless long-running job behavior proves necessary.

## Open Items

- Confirm account limits, maximum synchronous runtime behavior, and billing implications during implementation.
- Confirm whether zero-retention mode is available for the user's ElevenLabs account before documenting it as an operational recommendation.
