# FFmpeg M4A/AAC Processing

## Overview

This note collects implementation-level guidance for a proposed TypeScript tool that processes M4A/AAC audio with FFmpeg and FFprobe.

The main design goal is to keep audio processing non-destructive while supporting:

- synchronized playback and export of simultaneous tracks,
- exact channel mapping when preserving sources matters,
- deliberate mixdown when the goal is a single listenable review file,
- denoising and loudness calibration as explicit, inspectable transforms,
- metadata extraction for pairing audio with transcripts and UI state,
- safe command construction from Node.js.

Primary sources used here are the FFmpeg CLI, filters, formats, codecs, and ffprobe manuals, Node.js `child_process` docs, and ITU-R BS.1770 for loudness measurement context. The local sample M4A files in this repository were also probed to ground the recommendations in the actual project assets.

## Local Sample Context

The current repo contains several derived and source M4A files:

- `recording-2026-05-14-15-59.mic.m4a`
- `recording-2026-05-14-15-59.system.m4a`
- `recording-2026-05-14-15-59.mixed.m4a`
- `recording-2026-05-14-15-59.merged-lr.m4a`
- `recording-2026-05-14-15-59.mic.clean.m4a`

Observed with `ffprobe`:

- The source files are AAC in M4A, mostly 48 kHz stereo.
- `recording-2026-05-14-15-59.mixed.m4a` is AAC mono at 96 kHz.
- Durations are roughly 44 minutes, so long-running jobs, streaming logs, and recoverable exports matter.

Practical consequence:

- Do not assume every input file has the same sample rate, channel count, or channel layout.
- Normalize explicitly before a merge or mix operation.
- Prefer a scratch/export directory so derived files remain distinct from source files.

## Key Concepts

### 1. Merge is not the same as mix

FFmpeg exposes three different audio-shaping primitives that are easy to confuse:

- `amerge` creates a multi-channel stream by concatenating channels from multiple inputs.
- `pan` remaps channels with explicit gains; it can act as a pure channel map when the coefficients are 0/1 and each output has exactly one input source.
- `amix` sums multiple inputs into a single output mix and is the right tool when you want combined listening audio rather than channel preservation.

Recommendation:

- Use `amerge` or pure-mapping `pan` when the goal is to preserve each source track separately inside one output.
- Use `amix` when the goal is a human-review mixdown.

### 2. Sync is a timestamp problem first

For simultaneous tracks, start by normalizing presentation timestamps, then correct offsets, then correct drift only if needed.

Useful tools:

- `asetpts=PTS-STARTPTS` to zero audio timestamps inside a filtergraph.
- `-itsoffset` to add a known input offset before decoding.
- `adelay` to delay one or more channels by a precise amount.
- `aresample=async=...` to stretch/squeeze samples to match timestamps when you need timestamp-driven correction.

### 3. Loudness calibration is a standards problem

FFmpeg's `loudnorm` filter is built around EBU R128 loudness normalization and supports integrated loudness, loudness range, and true peak targets. The broader measurement context comes from ITU-R BS.1770, which defines algorithms for loudness and true-peak measurement.

## Sync and Timestamp Handling

### Start-time alignment

If source tracks begin at different timestamps, normalize them to a common zero point before combining them.

Best-practice sequence:

1. Probe the files first.
2. Normalize timestamps with `asetpts=PTS-STARTPTS`.
3. Apply a known offset with `-itsoffset` or `adelay` if the source has a documented start lag.
4. Use `aresample=async=...` only when you need FFmpeg to correct timestamp drift by time-stretching or inserting/removing silence.

Why this matters:

- `amix` and `amerge` do not fix synchronization by themselves.
- `aresample` can conform audio to timestamps, but it is a correction tool, not a substitute for correct input alignment.

### Keeping timestamps predictable

If you want to preserve source timestamps, FFmpeg supports `-copyts`, but when used with `copyts`, `-start_at_zero` must also be set to keep timestamps starting at zero in the output path.

For a TypeScript tool, the safest operational model is usually:

- do not preserve raw timestamps unless the workflow explicitly requires it,
- normalize internal processing to zero-based timestamps,
- store original offsets in metadata or a sidecar record instead of relying on container timestamps alone.

## Channel Mapping vs Mixdown

### `amerge`

Use `amerge` when the purpose is to combine multiple tracks into a single multi-channel stream while keeping each source logically separate.

Important constraints from FFmpeg docs:

- all inputs must have the same sample rate and format,
- if durations differ, output stops at the shortest input,
- channel layout handling depends on `layout_mode`.

Recommended usage:

- use `layout_mode=normal` or `layout_mode=reset` when deterministic channel order matters,
- avoid relying on `legacy` layout inference if channel order is operationally important,
- probe and normalize sample rate/format before merging.

### `pan`

Use `pan` when you need explicit channel routing or a controlled downmix.

Two behaviors matter:

- if the coefficients are pure 0/1 channel copies and each output channel has a single source, FFmpeg can detect a pure channel mapping and use an optimized lossless route,
- if you write gains using `<` instead of `=`, FFmpeg renormalizes the gains to avoid clipping noise.

Recommended usage:

- exact source-preserving remap: `pan` with pure mapping,
- stereo downmix with controlled weights: `pan` with explicit gains and renormalization,
- avoid ad hoc channel assumptions if the input layouts may differ.

### `amix`

Use `amix` when the final result should sound like one blended review track.

Important behavior:

- it mixes multiple audio inputs into one output,
- it only supports float samples,
- integer inputs will cause FFmpeg to auto-insert `aresample`,
- `normalize=1` is the default, so it scales inputs rather than blindly summing them,
- `duration=longest` is the default, which is usually the least surprising choice for review exports.

Recommendation:

- pre-normalize and align inputs before mixdown,
- if you want one listenable file for human review, `amix` is the simplest default,
- if you want fidelity to source separation, `amix` is the wrong primitive.

## Denoising

### `afftdn`

`afftdn` is FFmpeg's FFT-based denoiser.

Relevant options:

- `nr` / `noise_reduction` controls reduction amount,
- `nf` / `noise_floor` sets the noise floor,
- `noise_type` can be `white`, `vinyl`, `shellac`, or `custom`,
- `track_noise` can adapt the floor over time,
- `output_mode=noise` is useful for diagnosing or auditioning what the filter considers noise.

Implementation notes:

- start conservatively; over-aggressive settings are easy to hear,
- treat denoise as a per-file or per-track step, not a blanket post-processing default,
- expose preview output so users can compare before and after without overwriting the source.

### `dynaudnorm`

`dynaudnorm` is a dynamic normalizer, not a standards-based loudness calibrator.

The FFmpeg docs describe it as evening out quiet and loud sections while retaining the dynamic range inside each section. That makes it useful for listenability previews, but it is not the same thing as broadcast-style loudness calibration.

Recommendation:

- use `dynaudnorm` only if the workflow wants perceptual leveling for preview,
- use `loudnorm` when the workflow wants repeatable loudness targets.

## Loudness Normalization and Calibration

### `loudnorm`

`loudnorm` is the main choice for calibrated output.

Key behaviors from the FFmpeg docs:

- it supports both dynamic and linear modes,
- it supports single-pass and double-pass workflows,
- it can target integrated loudness, loudness range, and maximum true peak,
- in dynamic mode, true-peak detection upsamples to 192 kHz,
- the output sample rate should be set explicitly with `-ar` or `aresample` if you need a fixed rate,
- the filter can emit stats in JSON format through `stats_file` plus `print_format=json`.

Practical workflow:

1. Run a first pass to measure each source or candidate output.
2. Capture `measured_I`, `measured_LRA`, `measured_TP`, `measured_thresh`, and `offset`.
3. Run a second pass with `linear=true` when the measured values satisfy the filter's constraints.
4. If the source is mono but intended for stereo playback, consider `dual_mono=true`.

Implementation notes:

- treat loudness calibration as a file-to-file comparison job, not a live guess,
- store the measured stats so exports are reproducible,
- set the project target loudness as a user-facing configuration choice rather than burying it in command strings.

## Recommended Review Outputs

### Primary review export

For everyday review, the best compatibility choice is usually:

- container: `m4a` or `mp4`,
- audio codec: FFmpeg's native `aac` encoder,
- profile: AAC-LC (`aac_low`, the default).

Why this is the best default:

- the FFmpeg mov/mp4/3gp muxer registers the `m4a` extension,
- the native AAC encoder defaults to `aac_low`,
- `-movflags +faststart` moves the `moov` atom to the start of the file for better playback behavior,
- the same muxer family supports fragmented or hybrid fragmented outputs when you want recoverable in-progress files.

### Secondary scratch export

Use a separate scratch or temp output when the user is iterating on:

- merge topology,
- denoise settings,
- loudness calibration targets,
- transcript/audio alignment.

The scratch file should be clearly labeled as derived, for example:

- `*.preview.m4a`
- `*.denoised.m4a`
- `*.mixed.m4a`
- `*.loudnorm.m4a`

Recommendation:

- keep the source files immutable,
- write derived exports to a dedicated folder,
- only promote a scratch file into a final export once the user confirms the result.

### Non-destructive preview/export strategy

The FFmpeg formats docs give two especially useful options:

- `+faststart` for normal review files,
- `hybrid_fragmented` for outputs that should remain readable while they are still being written.

Suggested operating model:

- preview = derived file in a temp/scratch location,
- export = named file in an output folder,
- original = never overwritten,
- if processing is interrupted, the partial file should still be recoverable when possible.

## FFprobe Metadata Extraction

`ffprobe` is designed to gather stream and container information in a machine-readable way.

For this tool, probe at least:

- container duration,
- filename,
- stream index,
- codec name,
- codec type,
- channel count,
- channel layout,
- sample rate,
- bit rate,
- stream tags and format tags.

Recommended extraction pattern:

```bash
ffprobe -v error \
  -select_streams a \
  -show_entries format=filename,duration:stream=index,codec_name,codec_type,channels,channel_layout,sample_rate,bit_rate:stream_tags=language,title:format_tags \
  -of json \
  input.m4a
```

Why this shape works:

- `-of json` gives a stable parse target,
- `-show_entries` limits output to the fields the app actually needs,
- stream tags and format tags are where transcript pairing metadata usually lives,
- `-select_streams a` keeps the result focused on audio.

Suggested app-side mapping:

- `duration` for timeline length,
- `sample_rate` and `channel_layout` for filter decisions,
- `tags.language` and `tags.title` for UI labels and transcript matching,
- `bit_rate` as an informational field, not as a control input.

## Node / TypeScript Command Construction Risks

### Use `spawn`, not shell strings

Node's `child_process` documentation is explicit:

- `exec()` runs a command inside a shell,
- `execFile()` spawns the executable directly,
- `spawn()` is the primary async process primitive.

For FFmpeg jobs, the safest default is:

- `spawn(ffmpegPath, argsArray, { shell: false })`

Reasons:

- string interpolation against shell syntax is fragile,
- shell metacharacters create injection risk,
- shell quoting differs across platforms,
- `spawn` and `execFile` avoid shell parsing by default.

### Do not rely on `exec` for FFmpeg output

The Node docs warn that shell execution can be dangerous with unsanitized input.

Also important:

- `execFile` and `exec` use `maxBuffer`,
- if stdout or stderr exceeds that limit, the process is terminated and output is truncated,
- FFmpeg logs can easily be verbose enough to hit that ceiling.

Recommendation:

- stream stdout/stderr with `spawn`,
- keep stderr consumption active so the process cannot block on a full pipe,
- use a bounded log strategy rather than buffering arbitrary output in memory.

### Disable interactive stdin

FFmpeg enables standard-input interaction by default unless stdin is used as an input.

For a Node app:

- pass `-nostdin` to FFmpeg,
- this prevents the child process from waiting for terminal-style interaction,
- it also avoids depending on shell redirection tricks like `< /dev/null`.

### Cancellation and timeouts

Node's child-process APIs support `AbortSignal`.

Recommendation:

- keep a cancellable `AbortController` for long audio jobs,
- expose a per-job timeout or cancel action in the tool UI,
- treat cancelled exports as aborted work products, not failures that should overwrite source state.

## Example Command Patterns

### 1. Probe a source file

```bash
ffprobe -v error \
  -select_streams a \
  -show_entries format=filename,duration:stream=index,codec_name,codec_type,channels,channel_layout,sample_rate,bit_rate \
  -of json \
  source.m4a
```

### 2. Merge two aligned tracks into one multi-channel file

```bash
ffmpeg -nostdin \
  -i mic.m4a \
  -i system.m4a \
  -filter_complex "[0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[a0][a1]amerge=inputs=2:layout_mode=normal[out]" \
  -map "[out]" \
  -c:a aac \
  -movflags +faststart \
  merged-review.m4a
```

Use this shape only when the source sample rates and formats are already compatible or have been normalized first.

### 3. Produce a listenable mixdown

```bash
ffmpeg -nostdin \
  -i mic.m4a \
  -i system.m4a \
  -filter_complex "[0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2:normalize=1[mix]" \
  -map "[mix]" \
  -c:a aac \
  -movflags +faststart \
  mixed-review.m4a
```

### 4. Denoise a single file

```bash
ffmpeg -nostdin \
  -i input.m4a \
  -af "afftdn=nr=12:nf=-50" \
  -c:a aac \
  -movflags +faststart \
  denoised.m4a
```

### 5. Two-pass loudness calibration

```bash
# pass 1
ffmpeg -nostdin -i input.m4a \
  -af "loudnorm=I=<target_I>:LRA=<target_LRA>:TP=<target_TP>:print_format=json:stats_file=loudnorm.json" \
  -f null -

# pass 2
ffmpeg -nostdin -i input.m4a \
  -af "loudnorm=I=<target_I>:LRA=<target_LRA>:TP=<target_TP>:measured_I=<...>:measured_LRA=<...>:measured_TP=<...>:measured_thresh=<...>:offset=<...>:linear=true" \
  -c:a aac \
  -movflags +faststart \
  calibrated.m4a
```

The exact loudness target should be a project decision.

## Assumptions & Scope

### Assumptions made

| Assumption | Confidence | Impact if wrong |
|---|---|---|
| The proposed TypeScript tool will invoke a local FFmpeg binary rather than a remote encoding service. | HIGH | Command construction, permissions, and I/O handling would change substantially. |
| "Review workflows" means human listening and comparison, not broadcast mastering. | MEDIUM | The output codec/container recommendation might shift toward higher-fidelity archival formats. |
| The tool will need both preserve-source and create-derived-file modes. | HIGH | The export strategy would need less emphasis on scratch files and provenance. |
| Source tracks may be aligned but not guaranteed to share identical start timestamps or sample rates. | HIGH | Sync and resampling logic would need more aggressive normalization. |
| Loudness targets are not yet fixed by product requirements. | HIGH | The `loudnorm` target values should remain configurable rather than hard-coded. |
| The repository's current audio sample set is representative enough to guide pipeline shape. | MEDIUM | Final defaults may need to be revisited if more diverse inputs appear. |

### Uncertainties and gaps

- The exact sync tolerance for "in sync" is not yet defined.
- It is unclear whether merged output should preserve separate source tracks or prioritize a single listenable mixdown.
- The desired denoise policy is not yet fixed: always-on, opt-in, or only for exported review files.
- The preferred loudness target is not defined.
- It is not yet clear whether the app should prefer AAC-only outputs or offer lossless scratch exports as a first-class option.

### Clarifying questions for follow-up

1. Should the default review export be a stereo mixdown, a multichannel preservation export, or both?
2. What loudness target should the tool normalize toward for spoken-word review?
3. Should denoising be applied only on demand, or should the export pipeline offer a default denoise preset?
4. Do you want the app to repair drift automatically, or only correct known offsets?
5. Should preview artifacts be kept automatically for rollback, or deleted after successful export?

## References

### Official / primary sources consulted

| Source | URL | What it contributed |
|---|---|---|
| FFmpeg Filters Documentation | https://ffmpeg.org/ffmpeg-filters.html | `amerge`, `amix`, `pan`, `afftdn`, `dynaudnorm`, `loudnorm`, `adelay`, `aresample`, `atrim`, `asetpts` behavior and examples. |
| FFmpeg CLI Documentation | https://ffmpeg.org/ffmpeg.html | `-map`, `-filter_complex`, `-copyts`, `-start_at_zero`, `-itsoffset`, `-nostdin`, and stream selection behavior. |
| FFmpeg Formats Documentation | https://ffmpeg.org/ffmpeg-formats.html | MOV/MP4/M4A muxer extensions, `+faststart`, fragmentation, and `hybrid_fragmented`. |
| FFmpeg Codecs Documentation | https://ffmpeg.org/ffmpeg-codecs.html | Native AAC encoder defaults and AAC profile behavior. |
| FFprobe Documentation | https://ffmpeg.org/ffprobe.html | JSON output, `-show_entries`, stream/format tag visibility, and machine-readable probe patterns. |
| Node.js `child_process` Documentation | https://nodejs.org/api/child_process.html | Safe subprocess patterns, shell risk warnings, `spawn`/`execFile` behavior, `maxBuffer`, and `AbortSignal` support. |
| ITU-R BS.1770 | https://www.itu.int/rec/R-REC-BS.1770-5-202311-I/en | Loudness and true-peak measurement standard referenced by FFmpeg loudness workflows. |
| Local sample M4A files in this repository | project root | Confirmed that the current assets are AAC/M4A, mostly 48 kHz stereo, with one 96 kHz mono derivative. |

### Recommended for deep reading

- FFmpeg Filters Documentation: best source for exact filter semantics and edge cases.
- FFmpeg Formats Documentation: best source for export container and recoverability options.
- Node.js `child_process` Documentation: essential for safe FFmpeg orchestration from TypeScript.
- ITU-R BS.1770: useful when deciding loudness targets and calibration policy.
