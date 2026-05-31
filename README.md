# Transcript Studio

Local-first TypeScript CLI and Electron desktop workspace for synchronized multi-track M4A playback, transcript JSONL navigation, and non-destructive FFmpeg-backed exports.

## Project Contents

This folder is self-contained. It includes application source, package metadata, tests, generated validation outputs, staged local inputs, agent instructions, issue tracking, and the documentation needed to continue development.

- `AGENTS.md` - project instructions and tool references for agents.
- `docs/design/` - design register, function register, plans, proposal, and mockups.
- `docs/reference/` - refined requests, investigations, scans, implementation reports, dependency validation, and test reports.
- `docs/research/` - technical research used by the design decisions.
- `docs/tools/transcript-studio.md` - dedicated tool documentation.
- `Issues - Pending Items.md` - pending and completed project issues.

## Commands

```bash
npm install
npm run build
npm start
npm run electron
npm test
npm run audit
```

After `npm start`, open the printed local URL in a browser. After `npm run electron`, the same local workspace opens in the Transcript Studio desktop window. Source media and transcript files are never overwritten; generated outputs are written only after collision checks.

The built CLI command is `transcript-studio`:

```bash
transcript-studio --help
transcript-studio start --port 5123
transcript-studio ui
transcript-studio ui --port 5123
transcript-studio transcribe --input /path/audio.m4a --provider soniox --confirm-external-upload
transcript-studio transcribe --session /path/session.json --provider apple-local --language en-US
```

## Implemented Scope

- Probe M4A files with `ffprobe`.
- Load one or more M4A tracks by dropping files into the Tracks panel, browsing local folders, or entering an absolute path manually.
- Stream local media to the browser through the backend.
- Control selected-track playback with play, pause, resume, seek, rewind, fast-forward, mute, solo, offsets, and drift display.
- Load JSONL transcripts by dropping files into the Transcript panel, browsing local folders, or entering an absolute path manually.
- Normalize transcript timestamps, group readable paragraphs, search/filter, and click transcript rows to seek selected tracks.
- Resize the Tracks/Session sidebar and Processing panel to balance workspace content.
- Export transcript presentation HTML.
- Build and run FFmpeg plans for mix, source-separated, denoise, and loudness jobs without shell-interpolated command strings.
- Transcribe M4A files through Soniox, ElevenLabs, or a configured Apple local helper.
- Save transcription outputs next to each source M4A as canonical Transcript Studio JSONL plus provider-native JSON.
- Plan and run transcription jobs from the CLI and the Electron/browser UI.

## Transcription Configuration

Set `TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER` when jobs should use a default provider. Soniox requires `SONIOX_API_KEY`, `SONIOX_API_KEY_EXPIRES_AT`, and `SONIOX_STT_MODEL`. ElevenLabs requires `ELEVENLABS_API_KEY`, `ELEVENLABS_API_KEY_EXPIRES_AT`, and `ELEVENLABS_STT_MODEL`. Apple local requires `TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE` unless a language is supplied, plus `TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH` pointing to the built helper executable.

Soniox and ElevenLabs upload source audio and require explicit per-job consent. Apple local transcription is the local/private option.
