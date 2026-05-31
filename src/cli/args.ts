import { COMMAND_NAME, DEFAULT_PORT, PRODUCT_NAME } from "../shared/app.js";
import type { TranscriptionPlanRequest, TranscriptionProviderId } from "../shared/types.js";

export const CLI_VERSION = "0.1.0";

export type CliAction = "start" | "ui" | "transcribe" | "help" | "version";

export interface CliOptions {
  action: CliAction;
  port: number;
  transcribe?: TranscribeCliOptions;
}

export interface TranscribeCliOptions extends TranscriptionPlanRequest {
  sessionPath?: string;
}

export function parseCliArgs(args: string[]): CliOptions {
  const normalized = args.filter((arg) => arg !== "--");
  if (normalized[0] === "transcribe") {
    return {
      action: "transcribe",
      port: DEFAULT_PORT,
      transcribe: parseTranscribeArgs(normalized.slice(1))
    };
  }

  let action: CliAction = "start";
  let port = DEFAULT_PORT;
  let commandSeen = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const arg = normalized[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === "start" || arg === "ui") {
      if (commandSeen) {
        throw new Error(`Multiple ${COMMAND_NAME} commands provided`);
      }
      action = arg;
      commandSeen = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return { action: "help", port };
    }
    if (arg === "--version" || arg === "-v") {
      return { action: "version", port };
    }
    if (arg === "--port") {
      const rawPort = normalized[index + 1];
      port = parsePort(rawPort);
      index += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      port = parsePort(arg.slice("--port=".length));
      continue;
    }
    throw new Error(`Unknown ${COMMAND_NAME} argument: ${arg}`);
  }

  return { action, port };
}

export function renderHelp(): string {
  return `${PRODUCT_NAME}

Usage:
  ${COMMAND_NAME} [start] [--port <port>]
  ${COMMAND_NAME} ui [--port <port>]
  ${COMMAND_NAME} transcribe --input <path.m4a> [--input <path.m4a> ...] [options]
  ${COMMAND_NAME} transcribe --session <session.json> [options]
  ${COMMAND_NAME} --help
  ${COMMAND_NAME} --version

Commands:
  start              Start the local ${PRODUCT_NAME} workspace.
  ui                 Launch the ${PRODUCT_NAME} Electron desktop app.
  transcribe         Transcribe M4A files and write JSONL plus provider-native JSON.

Transcription options:
  --provider <id>              soniox, apple-local, or elevenlabs.
  --language <code>            Repeatable language hint or Apple locale.
  --model <id>                 Provider model override.
  --diarize / --no-diarize     Request or disable diarization.
  --confirm-external-upload    Required for Soniox and ElevenLabs.
  --fail-on-capability-gap     Fail when requested metadata is unsupported.

Options:
  --port <port>      Bind the local backend to a TCP port. Default: ${DEFAULT_PORT}.
  -h, --help         Show this help text.
  -v, --version      Show the ${COMMAND_NAME} version.
`;
}

function parseTranscribeArgs(args: string[]): TranscribeCliOptions {
  const inputPaths: string[] = [];
  const languageHints: string[] = [];
  let sessionPath: string | undefined;
  let providerId: TranscriptionProviderId | undefined;
  let model: string | undefined;
  let diarize: boolean | undefined;
  let confirmExternalUpload = false;
  let failOnCapabilityGap = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] as string | undefined;
    if (arg === undefined) {
      continue;
    }
    if (arg === "--input") {
      inputPaths.push(requiredArg(args, index, "--input"));
      index += 1;
      continue;
    }
    if (arg.startsWith("--input=")) {
      inputPaths.push(requiredInline(arg, "--input="));
      continue;
    }
    if (arg === "--session") {
      sessionPath = requiredArg(args, index, "--session");
      index += 1;
      continue;
    }
    if (arg.startsWith("--session=")) {
      sessionPath = requiredInline(arg, "--session=");
      continue;
    }
    if (arg === "--provider") {
      providerId = parseProviderId(requiredArg(args, index, "--provider"));
      index += 1;
      continue;
    }
    if (arg.startsWith("--provider=")) {
      providerId = parseProviderId(requiredInline(arg, "--provider="));
      continue;
    }
    if (arg === "--language") {
      languageHints.push(requiredArg(args, index, "--language"));
      index += 1;
      continue;
    }
    if (arg.startsWith("--language=")) {
      languageHints.push(requiredInline(arg, "--language="));
      continue;
    }
    if (arg === "--model") {
      model = requiredArg(args, index, "--model");
      index += 1;
      continue;
    }
    if (arg.startsWith("--model=")) {
      model = requiredInline(arg, "--model=");
      continue;
    }
    if (arg === "--diarize") {
      diarize = true;
      continue;
    }
    if (arg === "--no-diarize") {
      diarize = false;
      continue;
    }
    if (arg === "--confirm-external-upload") {
      confirmExternalUpload = true;
      continue;
    }
    if (arg === "--fail-on-capability-gap") {
      failOnCapabilityGap = true;
      continue;
    }
    if (arg === "--output-mode") {
      const mode = requiredArg(args, index, "--output-mode");
      if (mode !== "canonical-and-native") {
        throw new Error(`Unsupported --output-mode value: ${mode}`);
      }
      index += 1;
      continue;
    }
    if (arg.startsWith("--output-mode=")) {
      const mode = requiredInline(arg, "--output-mode=");
      if (mode !== "canonical-and-native") {
        throw new Error(`Unsupported --output-mode value: ${mode}`);
      }
      continue;
    }
    throw new Error(`Unknown ${COMMAND_NAME} transcribe argument: ${arg}`);
  }

  if (inputPaths.length > 0 && sessionPath !== undefined) {
    throw new Error("Use either --input or --session for transcription, not both");
  }
  if (inputPaths.length === 0 && sessionPath === undefined) {
    throw new Error("transcribe requires at least one --input path or a --session path");
  }

  return {
    inputPaths,
    ...(sessionPath === undefined ? {} : { sessionPath }),
    ...(providerId === undefined ? {} : { providerId }),
    ...(languageHints.length === 0 ? {} : { languageHints }),
    ...(model === undefined ? {} : { model }),
    ...(diarize === undefined ? {} : { diarize }),
    confirmExternalUpload,
    failOnCapabilityGap
  };
}

function parseProviderId(value: string): TranscriptionProviderId {
  if (value === "soniox" || value === "apple-local" || value === "elevenlabs") {
    return value;
  }
  throw new Error(`Unsupported transcription provider: ${value}`);
}

function requiredArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];
  if (value === undefined || value.trim().length === 0 || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function requiredInline(arg: string, prefix: string): string {
  const value = arg.slice(prefix.length);
  if (value.trim().length === 0) {
    throw new Error(`${prefix.slice(0, -1)} requires a value`);
  }
  return value;
}

function parsePort(rawPort: string | undefined): number {
  const port = rawPort === undefined ? Number.NaN : Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid --port value: ${rawPort ?? ""}`);
  }
  return port;
}
