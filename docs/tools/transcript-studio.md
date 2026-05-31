<toolName>
    <objective>
        Local-first TypeScript CLI and Electron desktop tool for synchronized multi-track M4A playback, transcript JSONL navigation, and non-destructive FFmpeg-backed audio exports.
    </objective>
    <command>
        transcript-studio
    </command>
    <info>
        Transcript Studio is a local-first workspace served by a Node.js/TypeScript backend and presented through both a command-line launcher and an Electron desktop UI. It is designed for synchronized review of one or more M4A recordings, timestamp-linked transcript navigation, FFmpeg/ffprobe-backed derived exports, and multi-provider M4A transcription while preserving source media and source transcripts.

        Command line parameters and their description:
        - `start`: Starts the local Transcript Studio workspace. This is the default action when no command is supplied.
        - `ui`: Launches the Transcript Studio Electron desktop app.
        - `transcribe`: Transcribes one or more M4A files, or all tracks in a saved session manifest, and writes canonical JSONL plus provider-native JSON next to each source M4A.
        - `--port <port>`: Binds the local backend to a specific TCP port. The default port is `4317`.
        - `--help` or `-h`: Prints command usage.
        - `--version` or `-v`: Prints the current CLI version.

        Examples of usage:
        - Start the local workspace from the project root after building:
          `transcript-studio`
        - Start on a specific local port:
          `transcript-studio start --port 5123`
        - Launch the Electron desktop app:
          `transcript-studio ui`
        - Launch the Electron desktop app on a specific local port:
          `transcript-studio ui --port 5123`
        - Transcribe one file with Soniox:
          `transcript-studio transcribe --input /path/audio.m4a --provider soniox --confirm-external-upload`
        - Transcribe selected files with ElevenLabs:
          `transcript-studio transcribe --input /path/a.m4a --input /path/b.m4a --provider elevenlabs --confirm-external-upload`
        - Transcribe a saved session locally with Apple:
          `transcript-studio transcribe --session /path/session.json --provider apple-local --language en-US`
        - Print help:
          `transcript-studio --help`
        - Launch the Electron desktop app from the project root after building:
          `npm run electron`

        Configuration and prerequisites:
        - FFmpeg and ffprobe must be available as executable commands.
        - Missing prerequisites are reported explicitly; the implementation does not substitute fallback configuration values.
        - `TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER` is required when a transcription job does not pass `--provider` or select a provider in the UI.
        - Soniox jobs require `SONIOX_API_KEY`, `SONIOX_API_KEY_EXPIRES_AT`, and `SONIOX_STT_MODEL`.
        - ElevenLabs jobs require `ELEVENLABS_API_KEY`, `ELEVENLABS_API_KEY_EXPIRES_AT`, and `ELEVENLABS_STT_MODEL`.
        - Apple local jobs require `TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE` unless a language/locale is supplied, and `TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH` pointing to the built Apple helper executable.
        - Configuration is resolved from shell environment, `~/.tool-agents/transcript-studio/.env`, project `.env`, and command/UI overrides, with later sources taking priority.
        - Soniox and ElevenLabs upload source audio and require explicit per-job confirmation through `--confirm-external-upload` or the UI consent checkbox.
        - Apple local transcription is local/private and requires macOS support plus installed local speech assets.

        Implementation notes:
        - The CLI and Electron UI reuse the same backend, frontend, transcript, staging, and FFmpeg processing modules.
        - The Electron app starts a local backend and loads the existing workspace at `http://127.0.0.1:<port>`.
        - Original audio and transcript files are never overwritten.
        - Derived audio, transcription, and presentation outputs are written with explicit names and collision checks.
        - FFmpeg and ffprobe invocations use argument arrays rather than shell-interpolated command strings.
        - Provider failures are surfaced explicitly. Transcript Studio does not silently retry with a different transcription provider.
    </info>
</toolName>
