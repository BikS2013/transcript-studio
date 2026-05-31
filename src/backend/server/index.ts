import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import { DEFAULT_PORT, PRODUCT_NAME } from "../../shared/app.js";
import { checkPrerequisites } from "../config/prerequisites.js";
import { buildProcessingPlan } from "../ffmpeg/commands.js";
import { probeAudioFile } from "../ffmpeg/probe.js";
import { runProcessingPlan } from "../ffmpeg/runner.js";
import { stageDroppedM4a, stageDroppedTranscript } from "../media/drop.js";
import { exportTranscriptHtml, loadJsonlTranscripts, writeTranscriptHtml } from "../transcript/jsonl.js";
import type { ProcessingPlanRequest, TranscriptBundle } from "../../shared/types.js";

const API_MAX_BODY_BYTES = 5 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;

export interface StartServerOptions {
  port?: number;
  host?: string;
  log?: boolean;
}

export interface StartedServer {
  server: Server;
  host: string;
  port: number;
  url: string;
  ready: Promise<void>;
  close: () => Promise<void>;
}

export function startServer(options: StartServerOptions = {}): StartedServer {
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? "127.0.0.1";
  const shouldLog = options.log ?? true;
  const server = createServer((request, response) => {
    void routeRequest(request, response);
  });
  const url = `http://${host}:${port}`;
  const ready = new Promise<void>((resolveReady, rejectReady) => {
    const rejectOnError = (error: Error): void => {
      rejectReady(error);
    };
    server.once("error", rejectOnError);
    server.listen(port, host, () => {
      server.off("error", rejectOnError);
      if (shouldLog) {
        console.log(`${PRODUCT_NAME} listening at ${url}`);
      }
      resolveReady();
    });
  });

  return {
    server,
    host,
    port,
    url,
    ready,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error !== undefined) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      })
  };
}

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/api/health") {
      await sendJson(response, 200, await checkPrerequisites());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/probe") {
      const body = await readJsonBody(request);
      const paths = requestPaths(body);
      await sendJson(response, 200, { results: await Promise.all(paths.map((path) => probeAudioFile(path))) });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/dropped-media") {
      const fileName = url.searchParams.get("filename");
      if (fileName === null || fileName.trim().length === 0) {
        await sendJson(response, 400, { error: "filename query parameter is required" });
        return;
      }
      if (extname(fileName).toLowerCase() !== ".m4a") {
        await sendJson(response, 400, { error: `Dropped file must be an M4A file: ${fileName}` });
        return;
      }
      await sendJson(response, 200, await stageDroppedM4a({ fileName, source: request }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/dropped-transcripts") {
      const fileName = url.searchParams.get("filename");
      if (fileName === null || fileName.trim().length === 0) {
        await sendJson(response, 400, { error: "filename query parameter is required" });
        return;
      }
      if (extname(fileName).toLowerCase() !== ".jsonl") {
        await sendJson(response, 400, { error: `Dropped file must be a JSONL transcript file: ${fileName}` });
        return;
      }
      await sendJson(response, 200, await stageDroppedTranscript({ fileName, source: request }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/transcripts/load") {
      const body = await readJsonBody(request);
      await sendJson(response, 200, await loadJsonlTranscripts(requestPaths(body), stringField(body, "anchorIso") === undefined ? {} : { anchorIso: stringField(body, "anchorIso") as string }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/transcripts/export-html") {
      const body = await readJsonBody(request);
      const bundle = transcriptBundleFromBody(body);
      const title = stringField(body, "title");
      const outputPath = stringField(body, "outputPath");
      if (outputPath === undefined) {
        await sendJson(response, 200, { html: exportTranscriptHtml(bundle, title) });
        return;
      }
      await sendJson(response, 200, await writeTranscriptHtml(outputPath, bundle, title));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/process/plan") {
      const body = await readJsonBody(request);
      await sendJson(response, 200, await buildProcessingPlan(body as unknown as ProcessingPlanRequest));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/process/run") {
      const body = await readJsonBody(request);
      await sendJson(response, 200, await runProcessingPlan(body as unknown as ProcessingPlanRequest));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/media") {
      await serveMedia(url, request, response);
      return;
    }
    if (request.method === "GET") {
      await serveStatic(url.pathname, response);
      return;
    }
    await sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 500;
    await sendJson(response, status, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function serveMedia(url: URL, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const path = url.searchParams.get("path");
  if (path === null || path.trim().length === 0) {
    await sendJson(response, 400, { error: "path query parameter is required" });
    return;
  }

  const absolutePath = resolve(path);
  const info = await stat(absolutePath);
  if (!info.isFile()) {
    await sendJson(response, 404, { error: "Media path is not a file" });
    return;
  }

  const range = request.headers.range;
  const mimeType = mediaContentType(absolutePath);
  if (range === undefined) {
    response.writeHead(200, {
      "accept-ranges": "bytes",
      "content-length": info.size,
      "content-type": mimeType
    });
    createReadStream(absolutePath).pipe(response);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match === null) {
    response.writeHead(416, { "content-range": `bytes */${info.size}` });
    response.end();
    return;
  }

  const start = match[1] === "" ? 0 : Number(match[1]);
  const end = match[2] === "" ? info.size - 1 : Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= info.size) {
    response.writeHead(416, { "content-range": `bytes */${info.size}` });
    response.end();
    return;
  }

  response.writeHead(206, {
    "accept-ranges": "bytes",
    "content-length": end - start + 1,
    "content-range": `bytes ${start}-${end}/${info.size}`,
    "content-type": mimeType
  });
  createReadStream(absolutePath, { start, end }).pipe(response);
}

async function readJsonBody(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.byteLength;
    if (received > API_MAX_BODY_BYTES) {
      throw new Error("Request body exceeds size limit");
    }
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim().length === 0) {
    return {};
  }
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed)) {
    throw new SyntaxError("JSON request body must be an object");
  }
  return parsed;
}

function requestPaths(body: JsonRecord): string[] {
  if (Array.isArray(body.paths)) {
    const paths = body.paths.filter((value): value is string => typeof value === "string" && value.length > 0);
    if (paths.length !== body.paths.length || paths.length === 0) {
      throw new Error("paths must contain at least one non-empty string");
    }
    return paths;
  }
  const path = stringField(body, "path");
  if (path !== undefined) {
    return [path];
  }
  throw new Error("Expected path or paths in request body");
}

function transcriptBundleFromBody(body: JsonRecord): TranscriptBundle {
  const bundle = body.bundle;
  if (isRecord(bundle) && Array.isArray(bundle.sources) && Array.isArray(bundle.segments) && Array.isArray(bundle.paragraphs)) {
    return bundle as unknown as TranscriptBundle;
  }
  throw new Error("bundle is required for HTML export");
}

async function serveStatic(requestPath: string, response: ServerResponse): Promise<void> {
  const staticRoot = resolve(process.cwd(), "dist/frontend");
  const normalizedPath = normalize(decodeURIComponent(requestPath === "/" ? "/index.html" : requestPath));
  const absolutePath = resolve(join(staticRoot, normalizedPath));
  if (absolutePath !== staticRoot && !absolutePath.startsWith(`${staticRoot}/`)) {
    await sendJson(response, 403, { error: "Forbidden" });
    return;
  }
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) {
      await sendJson(response, 404, { error: "Not found" });
      return;
    }
    response.writeHead(200, { "content-type": contentType(absolutePath) });
    createReadStream(absolutePath).pipe(response);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      await sendJson(response, 404, { error: "Frontend build not found. Run npm run build first." });
      return;
    }
    throw error;
  }
}

async function sendJson(response: ServerResponse, status: number, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(json)
  });
  response.end(json);
}

function portFromArgs(args: string[]): number {
  const index = args.indexOf("--port");
  if (index === -1) {
    return DEFAULT_PORT;
  }
  const raw = args[index + 1];
  const port = raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid --port value: ${raw ?? ""}`);
  }
  return port;
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function mediaContentType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

function stringField(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer({ port: portFromArgs(process.argv) });
}
