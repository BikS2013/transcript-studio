import { DEFAULT_PORT } from "../shared/app.js";

export function electronPortFromArgs(args: string[]): number {
  const portIndex = args.indexOf("--port");
  if (portIndex !== -1) {
    return parsePort(args[portIndex + 1]);
  }

  const portArg = args.find((arg) => arg.startsWith("--port="));
  if (portArg !== undefined) {
    return parsePort(portArg.slice("--port=".length));
  }

  return DEFAULT_PORT;
}

export function localWorkspaceUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

function parsePort(rawPort: string | undefined): number {
  const port = rawPort === undefined ? Number.NaN : Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid --port value: ${rawPort ?? ""}`);
  }
  return port;
}
