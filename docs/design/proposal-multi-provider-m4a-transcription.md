# Proposal: Multi-Provider M4A Transcription Support

## Provenance

- Refined request: `docs/reference/refined-request-multi-provider-m4a-transcription.md`
- Investigation: `docs/reference/investigation-multi-provider-m4a-transcription.md`
- Codebase scan: `docs/reference/codebase-scan-multi-provider-m4a-transcription.md`
- Technical research:
  - `docs/research/soniox-stt-api.md`
  - `docs/research/elevenlabs-speech-to-text-api.md`
  - `docs/research/apple-local-speech-transcription.md`

## Recommendation

Transcript Studio should add a backend-owned transcription service with provider adapters for Soniox, Apple local speech transcription, and ElevenLabs. Both CLI and Electron UI should call the same backend service. The service should produce two artifacts next to every source M4A file:

- Canonical Transcript Studio JSONL for immediate loading into the current transcript review workflow.
- Provider-native JSON preserving the full raw response for audit, debugging, and future re-normalization.

The provider list should not imply priority. A configured default provider should be required for jobs that do not explicitly select a provider, and users must be able to override the provider per job.

## Goals

- Support M4A transcription from CLI and Electron UI.
- Support single-file, batch, and full-session transcription workflows.
- Support Soniox API, Apple local SDK transcription, and ElevenLabs API.
- Preserve source audio files and never overwrite generated transcription outputs.
- Keep external API uploads explicit, visible, and user-approved.
- Keep Apple local transcription as the private/local mode.
- Preserve provider-native JSON and generate canonical JSONL.
- Surface provider capability differences instead of hiding them behind silent fallback.

## Non-Goals

- No silent fallback from one provider to another.
- No cloud session storage.
- No account, billing, or API-key provisioning UI.
- No replacement of the existing JSONL transcript loader.
- No implementation work in the proposal phase.

## Architecture

Add a new backend transcription domain:

```text
CLI / Electron UI
        |
        v
Backend transcription API
        |
        +-- config validation
        +-- provider capability checks
        +-- external-upload consent checks
        +-- job orchestration
        +-- output path planning and collision checks
        +-- provider-native JSON preservation
        +-- canonical JSONL normalization
        |
        +-- Soniox adapter
        +-- ElevenLabs adapter
        +-- Apple local adapter -> macOS native helper
```

Proposed files:

- `src/backend/transcription/providers.ts`
- `src/backend/transcription/config.ts`
- `src/backend/transcription/jobs.ts`
- `src/backend/transcription/output.ts`
- `src/backend/transcription/normalize.ts`
- `src/backend/transcription/providers/soniox.ts`
- `src/backend/transcription/providers/elevenlabs.ts`
- `src/backend/transcription/providers/apple-local.ts`
- `src/native/apple-transcriber/`

Existing files to extend:

- `src/shared/types.ts`
- `src/backend/server/index.ts`
- `src/backend/transcript/jsonl.ts`
- `src/backend/session/manifest.ts`
- `src/cli/args.ts`
- `src/cli/index.ts`
- `src/frontend/api/client.ts`
- `src/frontend/main.ts`
- `src/frontend/styles/app.css`

## Provider Model

Provider IDs:

- `soniox`
- `apple-local`
- `elevenlabs`

Shared provider contract:

```ts
interface TranscriptionProvider {
  id: TranscriptionProviderId;
  label: string;
  privacyMode: "external-upload" | "local";
  capabilities: TranscriptionCapabilities;
  validateConfig(config: TranscriptionConfig): Promise<TranscriptionWarning[]>;
  transcribe(request: ProviderTranscriptionRequest): Promise<ProviderTranscriptionResult>;
}
```

Capability metadata:

```ts
interface TranscriptionCapabilities {
  speakerDiarization: "supported" | "unsupported" | "unknown";
  segmentTimestamps: "supported" | "unsupported" | "unknown";
  languageDetection: "supported" | "unsupported" | "unknown";
  multiLanguage: "supported" | "unsupported" | "unknown";
  confidenceScores: "supported" | "unsupported" | "unknown";
  localOnly: boolean;
}
```

## Provider Capability Matrix

| Capability | Soniox API | Apple local | ElevenLabs API |
| --- | --- | --- | --- |
| External upload | Yes | No | Yes |
| Local/private mode | No | Yes | No |
| Speaker diarization | Supported by provider option | Not confirmed; treat as unsupported until validated | Supported by `diarize` |
| Segment timestamps | Supported from token timestamps | Supported from result time ranges | Supported from word timestamps |
| Language detection | Supported by language identification | Not equivalent; locale-based | Supported when language is not supplied |
| Multi-language | Supported by language identification/hints | Not confirmed for one mixed-language file | Supported/auto-detected by model behavior |
| Confidence scores | Supported at token level | Supported through result attributes | Supported in word result data |

Provider differences must be visible in the UI and CLI. If a user requests a provider with unsupported mandatory capabilities, Transcript Studio should fail with an explicit unsupported-capability error. For Apple local, the first implementation should either omit speaker fields with a visible capability warning or require a user option such as `--allow-provider-capability-gaps`; it must not pretend diarization exists.

## Workflows

### Single File

- CLI: `transcript-studio transcribe --input /path/audio.m4a --provider soniox --confirm-external-upload`
- UI: select one active track and run Transcribe.

### Batch

- CLI: repeat `--input` for multiple M4A files.
- UI: run Transcribe for selected tracks.
- Each source M4A gets its own canonical JSONL and provider-native JSON file next to the source audio.

### Session

- CLI: `transcript-studio transcribe --session /path/session.json --provider elevenlabs --confirm-external-upload`
- UI: run Transcribe for all loaded session tracks.
- Session manifest should record generated transcript outputs after successful completion.

## CLI Surface

Add a `transcribe` command:

```text
transcript-studio transcribe --input <path.m4a> [--input <path.m4a> ...]
transcript-studio transcribe --session <session.json>
```

Options:

- `--provider <soniox|apple-local|elevenlabs>`: overrides configured default provider for this job.
- `--language <code>`: repeatable language hint or Apple locale input.
- `--model <id>`: provider model override for the current job.
- `--diarize`: request speaker diarization where supported.
- `--no-diarize`: disable diarization.
- `--confirm-external-upload`: required for Soniox and ElevenLabs.
- `--output-mode <canonical-and-native>`: first version should support only canonical plus native.
- `--fail-on-capability-gap`: fail if the provider cannot satisfy requested metadata.

For jobs without `--provider`, the CLI must load `TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER`. If it is missing, the command fails with an explicit configuration error.

## Electron UI Surface

Add a Transcription section to the right Processing panel or a dedicated tab in that panel:

- Provider selector with default provider preselected.
- Capability badges for the selected provider.
- Scope selector: active track, selected tracks, entire session.
- Language hints/locale input.
- Diarization toggle, disabled when unsupported.
- External upload disclosure for Soniox and ElevenLabs.
- Transcribe button.
- Job status list with provider, input path, state, progress text, error, and output paths.
- Load generated canonical transcript button after success.

The UI should not use in-app text to explain every feature, but external-upload consent must be explicit because it changes the privacy behavior of the application.

## Configuration

Use the project-standard precedence chain, lowest to highest:

1. Shell environment variables.
2. `~/.tool-agents/transcript-studio/.env`.
3. Project-local `.env`.
4. CLI flags.

Required configuration:

- `TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER`: `soniox`, `apple-local`, or `elevenlabs`. Required when no provider is selected explicitly.

Soniox configuration:

- `SONIOX_API_KEY`: required for Soniox jobs.
- `SONIOX_API_KEY_EXPIRES_AT`: ISO date or datetime used to warn before expiration.
- `SONIOX_STT_MODEL`: required for Soniox jobs unless supplied by CLI/UI.

ElevenLabs configuration:

- `ELEVENLABS_API_KEY`: required for ElevenLabs jobs.
- `ELEVENLABS_API_KEY_EXPIRES_AT`: ISO date or datetime used to warn before expiration.
- `ELEVENLABS_STT_MODEL`: required for ElevenLabs jobs unless supplied by CLI/UI. Example from current docs: `scribe_v2`.

Apple local configuration:

- `TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE`: required for Apple local jobs unless supplied by CLI/UI.

No fallback configuration values are allowed. Missing required values must stop the job before any provider call or local transcription attempt starts.

Expiration handling:

- If an expiration field is missing for an API provider key, show a configuration warning and optionally fail in strict mode.
- If an expiration date is in the past, fail before starting the job.
- If an expiration date is within a warning window, surface a warning in CLI/UI but allow the job.

## Privacy and Consent

- `apple-local`: local-only; no upload.
- `soniox`: uploads the M4A or a provider-compatible upload to Soniox.
- `elevenlabs`: uploads the M4A or provider-compatible upload to ElevenLabs.

CLI jobs using external providers must require `--confirm-external-upload`. UI jobs using external providers must require an explicit confirmation action before submission.

## Output Files

Outputs are saved next to each source M4A file:

```text
<audio-base>.transcript-studio.<provider>.<timestamp>.jsonl
<audio-base>.transcript-studio.<provider>.<timestamp>.provider.json
```

Example:

```text
meeting.transcript-studio.soniox.20260531T143012Z.jsonl
meeting.transcript-studio.soniox.20260531T143012Z.provider.json
```

Rules:

- Never overwrite existing files.
- Validate parent directory writability before starting provider work when possible.
- If a planned output path exists, fail before provider submission.
- Record successful outputs in the session manifest as derived transcription outputs.

## Canonical JSONL Shape

Canonical records should remain compatible with the current JSONL loader while adding optional fields that future code can understand:

```json
{
  "id": "transcription-segment-001",
  "text": "Hello, this is the first segment.",
  "startMs": 1200,
  "durationSec": 3.4,
  "speaker": "speaker_0",
  "source": "transcription:soniox",
  "model": "stt-async-v3",
  "language": "en",
  "confidence": 0.94,
  "provider": "soniox",
  "providerResultRef": "meeting.transcript-studio.soniox.20260531T143012Z.provider.json",
  "raw": {
    "provider": "soniox",
    "tokenRange": [0, 14]
  }
}
```

The current parser preserves raw records, but `TranscriptSegment` should be extended with optional `confidence`, `provider`, and `providerResultRef` fields so the UI can display them deliberately.

## Normalization Strategy

- Soniox: group adjacent tokens by speaker, language, punctuation, and time gap into segments.
- ElevenLabs: group adjacent words by speaker, language, and time gap into segments.
- Apple local: map each finalized `SpeechTranscriber.Result` phrase/passage to a segment, preserving time-range and confidence attributes.

Grouping threshold should be configurable in code as a constant, not a user setting in the first version. A 2 to 3 second gap threshold matches the existing paragraph grouping style.

## Backend API

Add endpoints:

- `GET /api/transcription/providers`: provider list, capabilities, configured-default status, and warnings.
- `POST /api/transcription/plan`: validate request, provider, config, consent, capabilities, and output paths without starting the job.
- `POST /api/transcription/jobs`: start one or more transcription jobs.
- `GET /api/transcription/jobs/:id`: return job state, progress text, errors, and output paths.
- `GET /api/transcription/jobs`: list in-memory jobs for the current backend process.

Initial job storage can be in memory because durable outputs are written to disk. A future version can persist job history in the session manifest.

## Error Behavior

Fail explicitly for:

- Missing default provider when provider is not selected.
- Unknown provider.
- Missing API key.
- Expired API key.
- Missing required model.
- Missing Apple locale.
- Unsupported provider on current platform.
- Unsupported capability when strict mode is requested.
- External upload without consent.
- Output path collision.
- Provider authentication, billing, rate limit, validation, or internal errors.
- Native Apple helper failure.

No provider failure should trigger automatic retry with a different provider.

## Implementation Plan

### Phase 1: Provider-Neutral Foundation

- Add shared transcription types.
- Add config resolution and validation.
- Add output path planning and collision checks.
- Add provider registry and capability reporting.
- Add backend endpoints for providers and planning.
- Add unit tests.

### Phase 2: Soniox Provider

- Implement upload, transcription creation, polling, transcript retrieval, raw JSON preservation, and canonical JSONL normalization.
- Add mocked provider tests for success, API errors, rate limits, auth errors, and output collisions.

### Phase 3: ElevenLabs Provider

- Implement multipart upload, synchronous transcription handling, raw JSON preservation, and canonical JSONL normalization.
- Add mocked provider tests for diarization, language detection, word timestamps, confidence, and errors.

### Phase 4: Apple Local Provider

- Add a Swift helper under `src/native/apple-transcriber/`.
- Add TypeScript wrapper and platform checks.
- Add macOS availability, locale, and helper validation.
- Add integration tests where macOS and local speech models are available; keep non-macOS tests as explicit unsupported-platform tests.

### Phase 5: CLI and Electron UI

- Add `transcribe` CLI command and tests.
- Add UI provider selector, scope selector, consent flow, status list, and output loading.
- Add frontend API client methods and UI tests.

### Phase 6: Documentation and Validation

- Update README, tool documentation, configuration guide if requested, project design, and function register.
- Run `npm run typecheck`, `npm test`, and `npm audit`.
- Vet any new dependencies before adding them.

## Test Plan

Unit tests:

- Provider registry capability map.
- Config precedence and missing-value errors.
- Expiration-date parsing and warnings.
- Output path generation and collision errors.
- Soniox normalizer from fixture response.
- ElevenLabs normalizer from fixture response.
- Apple normalizer from helper JSON fixture.
- Unsupported capability behavior.

Backend tests:

- Provider list endpoint.
- Transcription plan endpoint.
- Job creation validation.
- Explicit provider error propagation.
- Derived-output manifest registration.

CLI tests:

- `transcribe` parser.
- Provider override.
- Missing default provider error.
- External upload confirmation requirement.
- Batch input validation.
- Session input validation.

Frontend tests:

- Provider selector renders capabilities.
- External provider consent is required.
- Apple local shows local/private state.
- Job status and errors render.
- Successful outputs can be loaded as transcripts.

Manual validation:

- Soniox real API smoke test with a short M4A.
- ElevenLabs real API smoke test with a short M4A.
- Apple local smoke test on supported macOS with installed speech assets.

## Documentation Updates

- `docs/design/project-design.md`: add a design decision for backend-owned provider transcription.
- `docs/design/project-functions.MD`: add transcription function requirements.
- `docs/tools/transcript-studio.md`: after implementation, add CLI transcription command and configuration reference.
- `README.md`: after implementation, document user workflow and privacy behavior.
- `docs/design/configuration-guide.md`: create or update during implementation if the user requests a full configuration guide.

## Open Questions Before Implementation

- Which provider should be configured as the default in the user's environment?
- Should external-upload consent be required for every job, or can the UI store per-provider consent?
- Should Soniox uploaded files be deleted automatically after successful transcript retrieval?
- Should Apple support be limited to macOS 26+ `SpeechTranscriber`, or should older `SFSpeechRecognizer` support be investigated as a separate compatibility track?
