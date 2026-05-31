# Refined Request: Multi-Provider M4A Transcription Support

## Category

Development, Design, Configuration, Research

## Objective

Prepare Transcript Studio to support transcribing M4A audio files through multiple speech-to-text providers: Soniox API, local Apple speech recognition, and ElevenLabs API. Produce a complete proposal that includes architecture, provider behavior, configuration, implementation plan, file-level impact, test plan, documentation updates, and rollout considerations before implementation.

## Scope

In scope:

- Add a proposal for transcription support across both the CLI and Electron UI.
- Support three transcription workflows:
  - Transcribe one selected M4A file.
  - Batch-transcribe multiple loaded M4A tracks.
  - Transcribe all applicable M4A files in a Transcript Studio session.
- Support three provider options:
  - Soniox API speech-to-text.
  - Local Apple SDK speech recognition.
  - ElevenLabs API speech-to-text.
- Provide a configured default transcription provider while allowing the user to override the provider per transcription request.
- Require explicit errors on provider failures; do not silently fall back to another provider.
- Allow Soniox and ElevenLabs to upload source audio to their external APIs, with explicit user-facing privacy/consent messaging.
- Keep Apple transcription as the local/private transcription mode.
- Save transcription outputs next to the source audio file.
- Preserve both canonical Transcript Studio JSONL output and provider-native JSON output.
- Include speaker diarization, segment-level timestamps, language detection, multi-language transcription, and confidence scores where provider support allows.
- Use the project's standard configuration approach, including API-key expiration-date fields and warning behavior.
- Cover macOS support for Apple SDK transcription from both Electron and CLI surfaces.

Out of scope for this proposal:

- Implementing transcription code in this request.
- Building account management, billing management, or remote credential provisioning for external providers.
- Silent provider fallback after failure.
- Replacing the existing JSONL transcript import and normalization pipeline.
- Saving generated transcripts to a central cloud or database location.

## Requirements

- The proposal must identify a provider abstraction that can support all three providers while exposing provider capability differences explicitly.
- The proposal must specify output naming conventions for side-by-side files saved next to the source M4A file.
- The proposal must specify how provider-native results are preserved and how canonical JSONL records are generated from them.
- The proposal must specify CLI commands/options and Electron UI controls for selecting a provider, defaulting to configured provider, and launching single-file, batch, and session transcription jobs.
- The proposal must specify configuration names, sources, precedence, validation rules, and expiration-date metadata for Soniox and ElevenLabs credentials.
- The proposal must specify that missing required configuration raises explicit errors and does not use fallback values.
- The proposal must specify local/private versus external-upload behavior in the UI and CLI before external API submissions.
- The proposal must account for Apple SDK platform limits and macOS-only behavior.
- The proposal must describe how transcription jobs report status, progress, errors, output paths, and provider metadata.
- The proposal must include a phased implementation plan, test plan, file-level integration map, and documentation updates.

## Constraints

- Transcript Studio is a local-first TypeScript CLI and Electron desktop app.
- All application code changes must stay inside the project root.
- Tool implementation must remain TypeScript.
- Original M4A source files must never be overwritten.
- Generated transcription artifacts must use explicit derived-output names and collision checks.
- Missing configuration values must raise explicit errors; no fallback configuration values are allowed.
- New dependencies must be vetted before being added to package manifests.
- Any test scripts outside the package-local test suite must live under `test_scripts/`.
- No version-control operations may be performed unless explicitly requested.

## Acceptance Criteria

- A proposal document exists under `docs/design/` and covers architecture, provider abstraction, workflows, configuration, privacy, output artifacts, implementation phases, test plan, and file-level impact.
- The proposal covers Soniox API, local Apple SDK transcription, and ElevenLabs API transcription.
- The proposal covers CLI and Electron UI support.
- The proposal covers single-file, batch, and session transcription workflows.
- The proposal defines canonical JSONL and provider-native JSON output handling.
- The proposal defines explicit error behavior with no silent fallback.
- The proposal defines configuration and credential-expiration handling according to the project instructions.
- The proposal updates the design register and function register with the proposed transcription capabilities.
- The proposal identifies open questions or provider constraints that require validation before implementation.

## Assumptions

- The provider order listed by the user is not a priority order and should not imply a default provider.
- Provider capability differences are acceptable if they are documented clearly and surfaced in UI/CLI behavior.
- Apple SDK support is macOS-only and may require a native helper or Electron main-process bridge rather than browser-only frontend code.
- Output files saved next to audio files must be collision-safe and non-destructive.
- External provider uploads are allowed only after clear user-facing disclosure.

## Open Questions

- Which provider should be the initial configured default in examples and documentation?
- Should the app require explicit one-time consent per external provider, or ask for confirmation on every external transcription job?
- What filename suffixes should be preferred for canonical JSONL and provider-native JSON artifacts?
- Should confidence scores be represented at segment level only, or should the data model reserve optional word-level confidence for future providers?

## Original Request

> I want you to prepare the transcript studio to support a number of different options for transcribing M4A files.
> The first option must be the Soniox API for transcriptions, speech-to-text.
> The next one must be the local Apple SDK for transcribing audio content.
> The third one must be the 11 Labs API for speech-to-text conversion.
>
> Agoniou to ask me for any clarifications or, uh, additional information needed to prepare a proposal for this support.
>
> Clarification answers:
>
> 1. include everything
> 2. both
> 3. all the 3 options
> 4. configured default provider, user must allowed to change
> 5. fail with explicit error
> 6. yes for both
> 7. both
> 8. speaker diarization, segment-level timestamps, language detection, multi-language transcription, confidence scores
> 9. standard configuration approach accoding to instruction + expiration date fields
> 10. both
> 11. saved next to audio file
> 12. it is just an initial list
