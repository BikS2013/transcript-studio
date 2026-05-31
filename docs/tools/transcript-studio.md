<toolName>
    <objective>
        Local-first TypeScript CLI and Electron desktop tool for synchronized multi-track M4A playback, transcript JSONL navigation, and non-destructive FFmpeg-backed audio exports.
    </objective>
    <command>
        transcript-studio
    </command>
    <info>
        Transcript Studio is a local-first workspace served by a Node.js/TypeScript backend and presented through both a command-line launcher and an Electron desktop UI. It is designed for synchronized review of one or more M4A recordings, timestamp-linked transcript navigation, and FFmpeg/ffprobe-backed derived exports while preserving source media and source transcripts.

        Command line parameters and their description:
        - `start`: Starts the local Transcript Studio workspace. This is the default action when no command is supplied.
        - `ui`: Launches the Transcript Studio Electron desktop app.
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
        - Print help:
          `transcript-studio --help`
        - Launch the Electron desktop app from the project root after building:
          `npm run electron`

        Configuration and prerequisites:
        - FFmpeg and ffprobe must be available as executable commands.
        - Missing prerequisites are reported explicitly; the implementation does not substitute fallback configuration values.
        - The current implementation does not require API keys, credentials, hosted services, or expiring tokens.

        Implementation notes:
        - The CLI and Electron UI reuse the same backend, frontend, transcript, staging, and FFmpeg processing modules.
        - The Electron app starts a local backend and loads the existing workspace at `http://127.0.0.1:<port>`.
        - Original audio and transcript files are never overwritten.
        - Derived audio and presentation outputs are written with explicit names and collision checks.
        - FFmpeg and ffprobe invocations use argument arrays rather than shell-interpolated command strings.
    </info>
</toolName>
