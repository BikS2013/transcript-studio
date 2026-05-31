# Refined Request: Synchronized Audio and Transcript Tool Proposal

## Category
Design / Development Proposal

## Objective
Prepare a self-contained proposal and design package for a TypeScript application tool that can load one or more M4A audio files, play selected files in synchronization, navigate and control playback by timestamp, process audio through FFmpeg operations such as merge, denoise, and level calibration, ingest one or more transcription JSONL files, and present a readable timestamped transcript that can drive audio navigation. The current request is to produce the proposal, mockups, constraints, questions, and downstream work breakdown; it explicitly excludes implementation of the tool.

## Scope
- **In scope**:
  - Define the proposed tool's user-facing capabilities for loading, selecting, synchronizing, playing, pausing, resuming, fast-forwarding, rewinding, and seeking across multiple M4A audio files.
  - Define how playback controls should apply to all loaded audio files or a user-selected subset of loaded files.
  - Define expected FFmpeg-backed audio operations: merging selected files into one audio file, denoising selected files, and calibrating audio levels between selected files.
  - Define how the tool should receive, validate, and interpret one or more transcription JSONL files associated with the loaded audio files.
  - Define the expected transcript presentation document or view, including readable text, clean timestamps, speaker/source labels where available, and timestamp-driven navigation into selected audio files.
  - Include proposal deliverables such as architecture options, user workflows, risks, tradeoffs, implementation phases, and task distribution across downstream agents or workstreams.
  - Include design deliverables such as low-fidelity mockups, screen/view inventory, key UI states, interaction notes, and accessibility/usability considerations.
  - Collect open questions, concerns, and clarifications needed before implementation planning.
  - Account for local project context, including existing M4A and JSONL transcript artifacts in the project root as representative sample inputs.
- **Out of scope**:
  - Implementing the TypeScript application tool.
  - Installing dependencies or modifying package manifests.
  - Running FFmpeg transformations on the existing audio files as part of this refinement task.
  - Creating final production UI assets beyond proposal-level mockups.
  - Creating or changing source code, test scripts, tool documentation, or configuration files except for this refined request specification.
  - Choosing a final implementation stack without investigation and technical research.
  - Performing version control operations.

## Requirements
1. The proposal must describe a TypeScript application tool, because project instructions require project tools to be implemented in TypeScript.
2. The proposal must explain how users load one or more M4A audio files and how each loaded file is represented in the UI with filename, duration, track identity, selection state, and playback status.
3. The proposal must define synchronized playback behavior for selected audio files, including play, pause, resume, seek-to-timestamp, fast-forward, and rewind operations.
4. The proposal must distinguish between controls that apply to all loaded audio files and controls that apply only to a selected subset.
5. The proposal must address synchronization concerns, including track start offsets, drift detection, latency tolerance, manual offset correction, and what happens when selected tracks have different durations.
6. The proposal must define FFmpeg-backed operations for merging selected tracks into a single audio file, denoising selected tracks or outputs, and calibrating audio levels between tracks.
7. The proposal must identify non-destructive handling expectations for audio processing, including preserving original files and writing generated outputs with explicit names.
8. The proposal must define accepted transcription input as one or more JSONL files and document the expected minimum fields, including timestamp information and transcript text.
9. The proposal must account for the existing representative JSONL shape in this project, including fields such as `speaker`, `id`, `durationSec`, `source`, `model`, `text`, `timestamp`, and `language`.
10. The proposal must define how transcript timestamps are normalized into clean human-readable forms such as `HH:MM:SS.mmm` or `MM:SS`, and how wall-clock timestamps map to audio-relative timestamps when needed.
11. The proposal must specify how the transcript presentation links transcript rows or segments to playback navigation for one or more selected audio files.
12. The proposal must include requirements for transcript readability, including segment grouping, speaker/source labels, timestamp display, search/filter affordances, and clear handling of multilingual transcript text.
13. The proposal must include low-fidelity mockups for the main tool views, at minimum: audio loading/track list, synchronized playback workspace, transcript navigation view, audio processing/export view, and settings/configuration view if configuration is needed.
14. The proposal must include a task distribution plan for downstream workstreams or agents, such as investigator, technical-researcher, planner, designer, codebase-scanner, implementation, review, and test-building.
15. The proposal must identify where investigation is needed before implementation, including technology choices for desktop versus web application shape, waveform rendering, audio synchronization, FFmpeg invocation, and transcript document generation.
16. The proposal must identify where technical research is needed after investigation, including FFmpeg filter chains, browser or desktop audio synchronization APIs, JSONL parsing and schema validation, and safe local file access.
17. The proposal must include a phased implementation roadmap, but the roadmap must remain proposal-level and must not prescribe final implementation details before investigation.
18. The proposal must list risks and concerns, including synchronization accuracy, FFmpeg availability, codec/container limitations, transcript/audio timestamp alignment, large-file performance, and destructive audio processing risk.
19. The proposal must include acceptance criteria for the future tool that can be used later by planners, implementers, reviewers, and test builders.
20. The proposal must preserve this refined request file as the authoritative scope input for downstream work.

## Constraints
- This refinement task must not implement the tool.
- The refined request must be saved under `docs/reference/` in the project root.
- All downstream plans must be created under `docs/design/` and named `plan-xxx-<indicative-description>.md`.
- The complete project design must be maintained in `docs/design/project-design.md` when design work begins.
- Functional requirements and feature descriptions must be registered in `docs/design/project-functions.MD` when functional design work begins.
- All reference material used for the project must be collected under `docs/reference/`.
- Any future tool creation must be TypeScript.
- Future tool creation must follow the project tool conventions. The project instructions require using the tool-conventions workflow or skill, and the existing `CLAUDE.md` says `/tool-conventions scaffold <tool-name>` is mandatory for tool scaffolding rather than hand-creating tool docs or tool configuration folders.
- Before creating code scripts for the project, downstream work must inspect existing tool references in the project instructions and any `docs/tools/` files to determine whether the script belongs inside an existing tool.
- Any future tool must be referenced from the project instruction file's Tools section with a concise entry and a path to its dedicated documentation under `docs/tools/`.
- If future implementation needs configuration, missing configuration values must raise explicit errors; the project instructions prohibit fallback configuration values.
- If a configuration guide is requested later, it must be created at `docs/design/configuration-guide.md` and describe configuration sources, priority, purpose, obtainment, storage, options, defaults if allowed, and expiration tracking for expiring credentials.
- Before adding any new runtime dependency, downstream work must vet the candidate version for known security advisories, pin a vetted version range, document the vetting date in `Issues - Pending Items.md`, install it, and run the project audit command with zero high-or-above advisories before considering the dependency step complete.
- Test scripts, if created later, must be placed in `test_scripts/`.
- Prompt files, if created later, must be placed under `prompts/` with sequential numeric prefixes.
- Issues, inconsistencies, or pending items detected during future work must be registered in the project root file `Issues - Pending Items.md`.
- No version control operation may be performed unless explicitly requested by the user.
- Existing representative project artifacts include M4A files and transcript JSONL files in the project root; the proposal may reference them as examples but must not modify them.

## Acceptance Criteria
1. A markdown refined request file exists at `docs/reference/refined-request-synchronized-audio-transcript-tool.md`.
2. The specification states that the current deliverable is a proposal/design package and that implementation is out of scope.
3. The specification includes explicit in-scope and out-of-scope boundaries.
4. The specification captures the future tool's required synchronized audio playback, selected-subset control, timestamp navigation, FFmpeg processing, and transcript presentation capabilities.
5. The specification includes proposal and design deliverables, including mockups, task distribution, investigation/research needs, risks, and open questions.
6. The specification includes project constraints from the active project instructions, including TypeScript-only tool creation, tool-convention workflow, documentation locations, no fallback configuration, dependency vetting, and no version control operations.
7. The specification includes verifiable downstream acceptance criteria for the proposal and for later implementation planning.
8. The original raw request is preserved verbatim.

## Assumptions
- The desired immediate outcome is a proposal/design artifact, not a working tool, because the user explicitly said "Do not implement the tool" in the orchestration request.
- The eventual tool may be a desktop app, local web app, CLI-assisted web app, or another TypeScript-based application shape; the final shape should be decided during investigation rather than assumed here.
- FFmpeg is expected to be installed or installable on the user's machine, but the proposal should still identify how the tool verifies FFmpeg availability and reports missing prerequisites.
- M4A files are the primary required input format; support for other audio formats is optional unless later requested.
- The JSONL transcript files are expected to contain one JSON object per line with at least transcript text and timestamp metadata.
- Existing files such as `recording-2026-05-14-15-59.transcript.jsonl` are representative samples for schema and workflow design.
- The transcript presentation may be implemented as an in-app view, generated HTML, generated Markdown, or another document-like artifact; the proposal should compare or recommend options after investigation.
- Denoising and audio-level calibration should be non-destructive by default and should produce derived output files.
- "In sync" means perceptually synchronized playback sufficient for reviewing a recorded conversation, but the exact tolerance threshold needs confirmation.

## Open Questions
1. What application shape is preferred for the eventual tool: desktop app, browser-based local web app, command-line tool with generated HTML viewer, or another form?
2. What synchronization tolerance is acceptable: frame/sample accurate, within 20-50 ms, within 100-250 ms, or "good enough" for manual review?
3. Should the tool support automatic offset detection between tracks, manual offset adjustment, or both?
4. Should audio files with different start times be aligned by embedded metadata, filename conventions, transcript timestamps, waveform correlation, manual user input, or a combination?
5. Should merging produce a single mixed track, a stereo file with source separation, a multichannel file, or multiple export options?
6. What denoising behavior is expected: simple FFmpeg filters, RNNoise/AI denoising if available, or configurable filter presets?
7. What does "calibrating audio levels" mean for this use case: peak normalization, loudness normalization such as EBU R128/LUFS, dynamic range compression, or manual gain controls?
8. Should processed outputs be M4A only, or should WAV/MP3/AAC exports also be offered?
9. How should JSONL transcript files be matched to audio files when there are multiple audio and transcript inputs?
10. Are transcript timestamps absolute wall-clock times, audio-relative offsets, or mixed depending on transcription source?
11. Should the transcript presentation support editing transcript text, speaker labels, and timestamps, or only read-only navigation?
12. Should the transcript presentation include search, speaker filters, source filters, topic/section headings, or bookmarks?
13. Should the tool support multilingual transcript segments and language-based filtering or display options?
14. Should the proposal include accessibility requirements such as keyboard shortcuts, screen-reader labels, high-contrast mode, and captions-style transcript navigation?
15. Should the final tool run fully offline, or may it use cloud services for optional transcription, diarization, or denoising?
16. Should user data remain local-only, and are there privacy constraints for recorded calls or transcripts?
17. Should the proposal account for very large audio files or long calls beyond the current sample duration?
18. Which downstream agents or workstreams should be mandatory for the next phase: investigator, technical-researcher, planner, designer, codebase-scanner, dependency-validator, test-builder, reviewer, or integration verifier?

## Original Request
I want you to create a TypeScript application tool that allows me to "load" one or more M4A audio files and run them in-sync (simultaneously). It should enable me to navigate them to specific timestamps, fast forward or rewind them. I want the tool to allow me pause and resume playback in sync. This must be allowed for all or some of the loaded audio files. The tool must offer the capability of merging them into a single audio file, denoising them, or calibrating the audio levels between them, using the FFmpeg utility as the underlying tool.

The tool must also receive one or more JSONL files containing transcriptions from the loaded audio files. It must produce a clear, readable transcription presentation document from these JSONL files with clean timestamps. It must be able to present it in a way that enables users to navigate the selected audio files to specific timestamps according to the transcription. This way, users can have a clear transcription while simultaneously experiencing the native audio of presenters and contributors speaking.

You must prepare a proposal for this application tool. You must prepare mock-ups of the tool and collect any questions, concerns, or clarifications needed to allow me to answer and work together to prepare a proposal and design for the tool.

You must use any available agent, such as Researcher, Technical Researcher, Planner, or whatever is needed, to prepare the document and distribute the tasks among different sub-agents, while protecting the memory context capacity.
