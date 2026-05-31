# Proposal: Synchronized Audio Transcript Tool

## Provenance

- Refined request: `docs/reference/refined-request-synchronized-audio-transcript-tool.md`
- Investigation: `docs/reference/investigation-synchronized-audio-transcript-tool.md`
- Technical research:
  - `docs/research/web-audio-synchronized-playback.md`
  - `docs/research/ffmpeg-m4a-processing.md`
  - `docs/research/jsonl-transcript-navigation.md`
- Codebase scan: skipped. This is a proposal/design task and the project currently has no application source tree to scan.

## Executive Summary

Build the tool as a local-first TypeScript application: a browser-based review workspace served by a local Node.js backend. The browser handles synchronized multi-track playback, timeline navigation, transcript review, and mockup-quality interaction. The Node backend owns privileged work: probing files with `ffprobe`, running FFmpeg processing jobs, writing derived outputs, and maintaining session manifests.

This approach gives the best balance for the requested workflow: rich transcript-driven navigation, selected-track synchronized playback, local-only privacy, native FFmpeg processing, and a future path to Electron packaging if a desktop app becomes mandatory.

## Proposed Product Shape

Working name: **Sync Transcript Studio**

Primary user outcome:

- Load one or more M4A recordings from the same conversation.
- Select which recordings are active.
- Play, pause, resume, seek, rewind, and fast-forward selected recordings in sync.
- Load one or more JSONL transcript files.
- Read a clean transcript with normalized timestamps.
- Click transcript rows to move selected audio tracks to the relevant timestamp.
- Export non-destructive audio derivatives: merged/mixed audio, source-separated audio, denoised audio, and loudness-calibrated audio.
- Export a transcript presentation document, with HTML as the first-class format and Markdown/PDF as derived options.

## Recommended Architecture

Use a **local web app with a Node.js/TypeScript backend and native FFmpeg**.

```text
Browser UI
  - track list and selection
  - synchronized playback controller
  - transcript/timeline navigation
  - processing/export forms
  - HTML transcript presentation

Local Node.js backend
  - session manifest
  - file/path validation
  - ffprobe metadata extraction
  - FFmpeg job orchestration
  - output naming and overwrite prevention
  - transcript normalization services if needed

Local files
  - source M4A files are preserved
  - JSONL files are preserved
  - derived outputs are written to explicit export folders
```

Rejected as first version:

- **Electron desktop app**: viable later, but adds embedded-browser security, dependency-vetting, packaging, and platform maintenance before the workflow is validated.
- **Pure CLI plus generated HTML**: useful as an export mode, but too weak for interactive synchronized playback and manual alignment.
- **Hosted/server-side processing**: useful only if collaboration becomes central; it introduces upload, storage, privacy, retention, and access-control obligations.

## Functional Scope

### Audio Loading

The tool should load M4A files through a file picker or project-session import flow. Each loaded track should show:

- filename and user-editable display name,
- duration,
- sample rate, channel count, codec, and creation time when available,
- selected/active state,
- mute/solo state,
- current offset from the session zero point,
- playback status,
- derived-output status.

The sample local files `recording-2026-05-14-15-59.mic.m4a` and `recording-2026-05-14-15-59.system.m4a` both report the same creation time and duration, so the tool should support metadata-based initial alignment while still allowing manual offset correction.

### Synchronized Playback

The playback controller should operate on all loaded tracks or only selected tracks.

Required controls:

- play selected,
- pause selected,
- resume selected,
- seek selected to timestamp,
- rewind selected by a fixed amount,
- fast-forward selected by a fixed amount,
- mute/unmute per track,
- solo one or more tracks,
- reset all selected tracks to session start.

The recommended implementation model is hybrid:

- use media elements for long M4A transport,
- use one `AudioContext` for clocking, routing, gain, and drift monitoring,
- use `HTMLMediaElement.currentTime` plus `seeked` for precise group seeks,
- use `GainNode` for track mute/solo/group gain,
- avoid relying on `timeupdate` as the sync clock.

### Alignment and Drift

The proposal should assume three alignment layers:

1. **Initial alignment** from matching metadata such as creation time and duration.
2. **Transcript alignment** from wall-clock transcript timestamps mapped to recording-relative offsets.
3. **Manual correction** through per-track offset controls.

Drift handling should be explicit:

- soft tolerance: show drift without interrupting playback,
- warning threshold: flag track as drifting,
- hard threshold: pause/reseek/resume the affected selected tracks.

The exact tolerance needs user confirmation. A practical first target is perceptual review sync, likely 50-100 ms, not sample-accurate mastering.

### FFmpeg Processing

All audio processing must be non-destructive. Original files are never overwritten.

Processing jobs:

- **Probe**: extract duration, codec, sample rate, channel layout, stream start, and creation tags with `ffprobe`.
- **Merge/source-separated export**: preserve tracks as separate channels where useful, using `amerge` or explicit `pan`.
- **Mixdown export**: create one listenable review file using `amix` after alignment and normalization.
- **Denoise**: apply conservative FFmpeg denoise filters, initially `afftdn`, as a selectable processing step.
- **Loudness calibration**: use `loudnorm`, ideally with a two-pass workflow for reproducible exports.
- **Preview exports**: generate temporary or clearly named preview files before final export.

Recommended output defaults:

- source-separated review export: M4A/MP4 with AAC-LC, source channels preserved where feasible,
- mixed review export: M4A/MP4 with AAC-LC and `+faststart`,
- scratch/intermediate files: clearly named `*.preview.m4a`, `*.denoised.m4a`, `*.loudnorm.m4a`, or similar.

The backend must invoke FFmpeg with argument arrays through `spawn` or `execFile`, not shell-interpolated command strings.

### JSONL Transcript Ingestion

The transcript layer should normalize multiple JSONL shapes into one canonical bundle.

Minimum supported transcript segment fields:

- text,
- timestamp or recording-relative time,
- optional duration,
- optional speaker,
- optional source,
- optional language,
- optional model,
- raw line provenance.

The local sample transcript has 135 JSONL segment records with `speaker`, `id`, `durationSec`, `source`, `model`, `text`, `timestamp`, and `language`. The local Q&A sidecar has a different `qa-sidecar/v1` shape and should be treated as annotations, not transcript segments.

Normalization rules:

- parse JSONL line by line,
- preserve raw records for audit,
- classify transcript segments separately from annotations,
- parse ISO wall-clock timestamps into epoch milliseconds,
- derive recording-relative timestamps from explicit `ts_recording_ms` when present, otherwise from an anchor timestamp,
- stable-sort by normalized time and original line number,
- group adjacent segments into readable paragraphs after sorting.

### Transcript Presentation

The primary transcript presentation should be HTML-first because it supports interactivity, keyboard navigation, print styling, and PDF export through browser print.

Transcript view requirements:

- clean timestamp column, such as `00:03:27` or `00:03:27.120`,
- speaker/source labels,
- language badge when relevant,
- searchable text,
- speaker/source filters,
- active-row highlighting during playback,
- click row to seek selected tracks,
- optional annotation blocks for Q&A sidecars,
- export to HTML and Markdown, with PDF produced from print styling if needed.

## Low-Fidelity Mockups

An HTML representation of these mockups is available at `docs/design/mockups-synchronized-audio-transcript-tool.html`. The HTML artifact also includes an additional combined version of the transcript navigation view that keeps synchronized playback visible while the user navigates to the nearest transcript window around the current playhead.

### 1. Load Workspace

```text
+------------------------------------------------------------------------------+
| Sync Transcript Studio                                                        |
| [Load Audio] [Load Transcript JSONL] [Open Session]              [Settings]   |
+------------------------------------------------------------------------------+
| Tracks                                                                       |
| [x] mic.m4a       44:12.245  AAC 48k stereo  offset +0.000s  [mute] [solo]   |
| [x] system.m4a    44:12.245  AAC 48k stereo  offset +0.000s  [mute] [solo]   |
| [ ] mixed.m4a     44:12.245  AAC 96k mono    derived         [mute] [solo]   |
|                                                                              |
| Alignment                                                                    |
| Session zero: 2026-05-14T12:59:51Z                                           |
| mic.m4a      [ -0.250 ] [ -0.050 ] [0] [ +0.050 ] [ +0.250 ]                 |
| system.m4a   [ -0.250 ] [ -0.050 ] [0] [ +0.050 ] [ +0.250 ]                 |
+------------------------------------------------------------------------------+
```

### 2. Synchronized Playback Workspace

```text
+------------------------------------------------------------------------------+
| 00:13:28.420 / 00:44:12.245          Active tracks: 2                         |
| [|< 10s] [< 5s] [Play/Pause] [5s >] [10s >] [Go to  __:__:__ ]               |
+------------------------------------------------------------------------------+
| mic.m4a    waveform -----------------------------------------------------|    |
| system.m4a waveform -----------------------------------------------------|    |
|            ^ playhead                                                        |
+------------------------------------------------------------------------------+
| Drift monitor                                                                |
| mic.m4a      master       0 ms                                               |
| system.m4a   aligned     +12 ms                                              |
+------------------------------------------------------------------------------+
```

### 3. Transcript Navigation View

```text
+------------------------------------------------------------------------------+
| Search transcript: [ fragmentation                         ]                  |
| Filters: [Speaker: All] [Source: All] [Language: All] [Only selected tracks]  |
+------------------------------------------------------------------------------+
| Time       Speaker     Transcript                                            |
| 00:13:52   Speaker 2   Ilya, I'm sorry, can I jump in?                       |
| 00:13:56   Speaker 2   Actually, as I told you, the second panelist...       |
| 00:14:03   Speaker 2   Ah, is he? Oh right...                                |
|                                                                              |
| Clicking a row seeks selected tracks to the row timestamp.                   |
+------------------------------------------------------------------------------+
```

### 4. Audio Processing and Export View

```text
+------------------------------------------------------------------------------+
| Processing                                                                    |
| Selected tracks: mic.m4a, system.m4a                                          |
|                                                                              |
| Export type: ( ) Source-separated  (*) Mixed review file  ( ) Both           |
| Alignment:   (*) Use current offsets  ( ) Recompute from metadata            |
| Denoise:     [ ] Apply afftdn preset   Preset: [Conservative]                |
| Loudness:    [x] Calibrate with loudnorm  Target: [-16 LUFS]                 |
| Output:      ./exports/recording-2026-05-14-15-59.review.m4a                 |
|                                                                              |
| [Preview 30 seconds] [Run Export] [Show FFmpeg Plan]                         |
+------------------------------------------------------------------------------+
```

### 5. Settings and Session View

```text
+------------------------------------------------------------------------------+
| Settings                                                                      |
| FFmpeg path:        /opt/homebrew/bin/ffmpeg        [Verify]                 |
| FFprobe path:       /opt/homebrew/bin/ffprobe       [Verify]                 |
| Output folder:      ./exports                         [Choose]               |
| Sync warning:       [ 0.050 ] seconds                                         |
| Sync correction:    [ 0.100 ] seconds                                         |
| Transcript anchor:  (*) audio creation time  ( ) earliest transcript time    |
| Privacy:            local-only processing                                     |
+------------------------------------------------------------------------------+
```

## Workflow

1. User opens the local tool.
2. User loads audio files.
3. Backend probes metadata and creates a session manifest.
4. User loads JSONL transcript files.
5. Transcript normalizer classifies segment streams and annotation sidecars.
6. Tool proposes an initial alignment.
7. User plays selected tracks and adjusts offsets if needed.
8. User reviews transcript and clicks timestamps to navigate audio.
9. User selects tracks and processing operations.
10. Backend previews or exports derived files through FFmpeg.
11. User exports transcript presentation document and session manifest.

## Proposed Artifact Model

```text
session/
  session.json
  exports/
    <basename>.review-mix.m4a
    <basename>.source-separated.m4a
    <basename>.denoised.m4a
    <basename>.loudnorm-stats.json
    <basename>.transcript.html
    <basename>.transcript.md
```

## Phased Roadmap

### Phase 1: Proposal Approval

- Confirm application shape.
- Confirm synchronization tolerance.
- Confirm transcript timestamp anchoring.
- Confirm export format defaults.
- Confirm whether transcript editing is in scope.

### Phase 2: Tool Scaffolding

- Use the project tool-convention workflow before creating source files or tool docs.
- Create the TypeScript project structure only after scaffold decisions are approved.
- Add only vetted dependencies.
- Verify FFmpeg/ffprobe prerequisites.

### Phase 3: Core Playback MVP

- Load/probe M4A files.
- Display track list.
- Select active tracks.
- Seek/play/pause/resume selected tracks together.
- Support manual offsets.
- Display drift status.

### Phase 4: Transcript MVP

- Load JSONL files.
- Normalize timestamps and schema variants.
- Render grouped transcript paragraphs.
- Click transcript timestamps to seek selected tracks.
- Export HTML transcript presentation.

### Phase 5: FFmpeg Processing

- Add source-separated export.
- Add mixed review export.
- Add conservative denoise preview/export.
- Add loudness calibration and stats capture.
- Add clear derived-output naming.

### Phase 6: Hardening and Tests

- Add focused tests for transcript normalization and command construction.
- Add sample-file integration tests where feasible.
- Add error handling for malformed JSONL, missing FFmpeg, invalid paths, and mismatched durations.
- Add accessibility and keyboard navigation pass.

## Task Distribution for Downstream Agents

- **Investigator**: completed architecture comparison and recommendation.
- **Technical researcher: Web Audio**: completed playback/sync timing research.
- **Technical researcher: FFmpeg**: completed M4A processing research.
- **Technical researcher: JSONL transcripts**: completed transcript normalization and navigation research.
- **Tool doc/config architect**: next phase only; scaffold the future tool documentation and configuration conventions before implementation.
- **Planner**: next phase; convert this proposal into implementation plan files with exact milestones and acceptance tests.
- **Designer**: next phase; turn the low-fidelity wireframes into detailed UI states and accessibility requirements.
- **Implementation worker**: later; implement backend, frontend, and transcript/export modules in disjoint scopes.
- **Test builder**: later; create tests under `test_scripts/` or the eventual project test structure, following project rules.
- **Reviewer/integration verifier**: later; verify security boundaries, FFmpeg command safety, non-destructive behavior, and transcript/audio sync.

## Risks and Concerns

- **Synchronization tolerance is not yet defined**. The implementation differs materially between perceptual review sync and sample-accurate sync.
- **Long M4A playback may not suit full in-memory decoding**. The research favors media-element transport with Web Audio routing for the first version.
- **Transcript/audio anchors may be ambiguous**. Some transcript files use wall-clock timestamps; some sidecars use recording-relative milliseconds.
- **FFmpeg filters can degrade audio if overused**. Denoise and dynamic normalization must be opt-in and previewable.
- **Command construction is security-sensitive**. FFmpeg must be invoked with argument arrays, not shell command strings.
- **Generated outputs need strong naming rules**. Originals must never be overwritten.
- **Electron may be tempting too early**. It should remain a packaging option, not the initial architecture.
- **Project lacks `AGENTS.md` today**. Future tool work should decide whether to create/sync it from `CLAUDE.md` before implementation agents rely on project-local instructions.

## Clarification Questions

1. Is the recommended local browser app plus Node backend acceptable, or do you want a desktop app from the first version?
2. What synchronization tolerance should the design target: under 20 ms, 20-50 ms, 50-100 ms, or perceptual review sync?
3. Should the first version include automatic offset detection, or is manual offset correction sufficient?
4. Which transcript anchor should be primary: audio creation time, earliest transcript timestamp, explicit user-set session zero, or per-file manifest metadata?
5. Should transcript rows seek every selected audio track by default?
6. Should transcript text and speaker labels be editable in the tool, or read-only for the first version?
7. Should merging default to mixed review audio, left/right source-separated audio, or both?
8. Should denoise be limited to conservative FFmpeg presets first, or should AI/RNNoise-style denoising be explored?
9. What loudness calibration target do you prefer for review exports, for example -16 LUFS, -18 LUFS, or another target?
10. Should generated outputs be placed beside source files, in `exports/`, or in a user-selected folder?
11. Should the transcript presentation document be HTML only first, or should Markdown/PDF be required in version one?
12. Must the tool remain fully offline and local-only?

## Proposal Acceptance Criteria

- The user can review the recommended architecture and compare it against rejected options.
- The proposal includes low-fidelity mockups for loading, playback, transcript navigation, export, and settings.
- The proposal identifies concrete questions that affect implementation scope.
- The proposal references the refined request, investigation, and technical research artifacts.
- The proposal avoids implementation and dependency installation.
- The proposal preserves the existing audio and transcript files untouched.
