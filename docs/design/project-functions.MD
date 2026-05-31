# Project Functions

## Function Register: Transcript Studio

### F-001: Load Audio Tracks

The tool must allow users to load one or more M4A audio files and represent each as a track with filename, display name, duration, codec metadata, selection state, mute/solo state, offset, and playback status.

### F-002: Select Active Playback Tracks

The tool must allow playback and processing controls to apply either to all loaded tracks or only to a user-selected subset.

### F-003: Synchronized Playback Controls

The tool must support synchronized play, pause, resume, seek-to-timestamp, rewind, and fast-forward for selected audio tracks.

### F-004: Manual Track Alignment

The tool must support per-track offset correction so users can align recordings that start at different times or drift perceptibly.

### F-005: Drift Monitoring

The tool must detect and surface drift between selected tracks according to a configurable tolerance selected during implementation planning.

### F-006: FFmpeg Probe

The tool must use FFprobe or equivalent FFmpeg utilities to inspect loaded audio files for duration, codec, sample rate, channel information, stream start, and creation metadata.

### F-007: Merge or Mix Audio

The tool must use FFmpeg to export selected tracks as a source-separated file, a mixed review file, or both, according to user-selected export settings.

### F-008: Denoise Audio

The tool must provide opt-in FFmpeg-backed denoising that writes derived outputs and never overwrites source audio.

### F-009: Calibrate Audio Levels

The tool must provide opt-in loudness calibration between selected tracks or export outputs, with a documented target and captured processing stats.

### F-010: Load Transcript JSONL

The tool must accept one or more JSONL transcript files and parse them line by line with clear file and line-number errors.

### F-011: Normalize Transcript Schemas

The tool must normalize transcript segment files and sidecar annotation files into a canonical transcript bundle while preserving raw record provenance.

### F-012: Clean Timestamps

The tool must convert wall-clock or recording-relative timestamps into clean human-readable recording timestamps suitable for review.

### F-013: Transcript Presentation

The tool must present transcript content in a readable view with grouped segments, speaker/source labels, language indicators where available, search, and filters.

### F-014: Transcript-Driven Navigation

The tool must allow users to click transcript rows or paragraphs to seek selected audio tracks to the corresponding recording timestamp.

### F-015: Export Transcript Presentation

The tool must export a clear transcript presentation document, with HTML as the first recommended format and Markdown/PDF as optional derived outputs.

### F-016: Session Manifest

The tool should save session state, including loaded tracks, transcript files, offsets, selection state, derived outputs, and user corrections.

### F-017: Non-Destructive Output Handling

The tool must preserve original audio and transcript files and write all generated artifacts with explicit derived-output names.

### F-018: Local-Only Privacy Mode

The tool should operate locally by default and avoid uploading audio or transcript files unless a future design explicitly introduces hosted processing.

### F-019: Dedicated Application Isolation

The implementation must keep all Transcript Studio application source, package files, build outputs, package-local tests, and project documentation inside the standalone project folder.

### F-020: FFmpeg Job Status and Validation

The tool must show FFmpeg/ffprobe job status, errors, output paths, cancellation state where supported, and validation results for derived media outputs.

### F-021: Session and Output Collision Safety

The tool must prevent accidental overwrite of existing derived outputs, record successful derived outputs in the session manifest, and surface explicit collision errors.

### F-022: Missing Prerequisite Errors

The tool must raise explicit errors when required executables or configuration values, including FFmpeg and ffprobe paths, are unavailable.

### F-023: Local Media Streaming

The implemented backend must expose browser-readable local audio through a controlled media endpoint with byte-range support so the frontend can play local file paths in an HTTP-served workspace.

### F-024: FFmpeg Job Execution

The implemented backend must execute FFmpeg jobs through safe executable-plus-argument arrays, validate that derived outputs exist and are non-empty, and report stdout/stderr and exit status to the UI.

### F-025: Package-Local Validation

The implementation must provide package-local tests for timestamp parsing, transcript normalization, FFmpeg command construction, collision handling, and session manifest behavior.

### F-026: Drag-and-Drop M4A Track Loading

The tool must allow users to drop one or more M4A files into the Tracks panel, stage those files locally without sending them to external services, reject unsupported files explicitly, and load valid dropped files through the same FFprobe-backed track metadata, selection, playback, and processing workflow used by manual path probing.

### F-027: Local File Picker Selection

The tool must allow users to browse/search local folders through browser file-picker controls for M4A tracks and JSONL transcripts, stage selected files locally, reject unsupported files explicitly, and preserve existing manual absolute-path entry.

### F-028: Drag-and-Drop JSONL Transcript Loading

The tool must allow users to drop one or more JSONL transcript files into the Transcript panel, stage those files locally, and load them through the existing transcript normalization and paragraph rendering pipeline.

### F-029: Resizable Workspace Panels

The tool must allow users to resize the left Tracks/Session sidebar and the right Processing panel within bounded widths so the transcript/review area can be balanced against supporting controls.

### F-030: Self-Contained Project Documentation

The project must contain the design register, function register, request/refinement artifacts, implementation reports, test reports, research, tool documentation, agent instructions, and pending-item log needed to continue development without referencing the previous parent folder.

### F-031: Command-Line Tool Surface

The tool must expose a canonical `transcript-studio` command that starts the local workspace, supports documented help/version output, accepts an explicit local port, and reports invalid arguments explicitly.

### F-032: Electron Desktop UI Surface

The tool must provide a locally runnable Electron desktop app, launchable through `transcript-studio ui`, that starts the same local backend, loads the existing Transcript Studio workspace, preserves local-only processing, and does not duplicate FFmpeg, transcript, staging, or playback logic.

### F-033: Multi-Provider M4A Transcription

The tool should support M4A transcription through a provider abstraction that can route jobs to Soniox API, Apple local speech transcription, or ElevenLabs API.

### F-034: Transcription Provider Default and Override

The tool should use a configured default transcription provider when no provider is selected explicitly, and it must allow CLI and Electron UI users to override the provider per transcription job.

### F-035: Transcription Workflow Scopes

The tool should support transcription for a single M4A file, a batch of selected M4A files, and all M4A files in a session.

### F-036: External Upload Consent

The tool must clearly identify Soniox and ElevenLabs transcription as external-upload operations and require explicit user confirmation before sending audio to those APIs.

### F-037: Apple Local Transcription Privacy

The tool should support Apple local speech transcription as the local/private transcription provider and must fail explicitly when the requested Apple local provider is unavailable on the current platform, OS version, locale, or installed speech model set.

### F-038: Canonical and Provider-Native Transcription Outputs

The tool must save both canonical Transcript Studio JSONL and provider-native JSON for each successful transcription job.

### F-039: Transcription Output Location and Collision Safety

The tool must save generated transcription files next to the source M4A file, use explicit derived-output names, and refuse to overwrite existing files.

### F-040: Transcription Metadata

The tool should preserve speaker diarization, segment-level timestamps, language information, multi-language indicators, and confidence scores where the selected provider supports those capabilities.

### F-041: Transcription Capability Reporting

The tool must expose provider capability differences to CLI and Electron UI users, including unsupported capabilities such as Apple local speaker diarization unless later validated.

### F-042: Transcription Configuration Validation

The tool must validate transcription configuration through the project-standard configuration precedence chain, require API-key expiration metadata for external providers, and raise explicit errors for missing or expired required values.

### F-043: Transcription Job Status

The tool must report transcription job status, provider, input path, output paths, warnings, and explicit provider or configuration errors.

### F-044: Generated Transcript Loading

The tool should allow users to load a generated canonical JSONL transcript into the existing transcript review and navigation workflow after a successful transcription job.

### F-045: No Silent Transcription Fallback

The tool must not silently retry or switch to another transcription provider after a selected provider fails.
