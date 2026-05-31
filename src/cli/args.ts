import { COMMAND_NAME, DEFAULT_PORT, PRODUCT_NAME } from "../shared/app.js";

export const CLI_VERSION = "0.1.0";

export type CliAction = "start" | "ui" | "help" | "version";

export interface CliOptions {
  action: CliAction;
  port: number;
}

export function parseCliArgs(args: string[]): CliOptions {
  let action: CliAction = "start";
  let port = DEFAULT_PORT;
  let commandSeen = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--") {
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
      const rawPort = args[index + 1];
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
  ${COMMAND_NAME} --help
  ${COMMAND_NAME} --version

Commands:
  start              Start the local ${PRODUCT_NAME} workspace.
  ui                 Launch the ${PRODUCT_NAME} Electron desktop app.

Options:
  --port <port>      Bind the local backend to a TCP port. Default: ${DEFAULT_PORT}.
  -h, --help         Show this help text.
  -v, --version      Show the ${COMMAND_NAME} version.
`;
}

function parsePort(rawPort: string | undefined): number {
  const port = rawPort === undefined ? Number.NaN : Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid --port value: ${rawPort ?? ""}`);
  }
  return port;
}
