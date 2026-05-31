import type {
  DroppedMediaResult,
  DroppedTranscriptResult,
  HealthStatus,
  ProbeResult,
  ProcessingPlan,
  ProcessingPlanRequest,
  ProcessingRunResult,
  TranscriptionJob,
  TranscriptionJobStartResponse,
  TranscriptionJobsResponse,
  TranscriptionPlan,
  TranscriptionPlanRequest,
  TranscriptionProvidersResponse,
  TranscriptBundle
} from "../../shared/types";

type JsonRecord = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class StudioApiClient {
  async health(): Promise<HealthStatus> {
    return requestJson<HealthStatus>("/api/health", { method: "GET" });
  }

  async probe(path: string): Promise<ProbeResult> {
    const payload = await requestJson<ProbeResult | { results: ProbeResult[] }>("/api/probe", {
      method: "POST",
      body: JSON.stringify({ path })
    });
    if ("results" in payload) {
      const result = payload.results[0];
      if (result === undefined) {
        throw new ApiError("Probe returned no results", 500, payload);
      }
      return result;
    }
    return payload;
  }

  async uploadDroppedM4a(file: File): Promise<DroppedMediaResult> {
    const response = await fetch(`/api/dropped-media?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: file
    });
    const payload = await readResponse(response);

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload["error"] === "string"
          ? payload["error"]
          : `Request failed with HTTP ${response.status}`;
      if (response.status === 404 && message === "Not found") {
        throw new ApiError(
          "Dropped-file upload endpoint is unavailable. Restart Transcript Studio after rebuilding.",
          response.status,
          payload
        );
      }
      throw new ApiError(message, response.status, payload);
    }

    return payload as DroppedMediaResult;
  }

  async uploadDroppedTranscript(file: File): Promise<DroppedTranscriptResult> {
    const response = await fetch(`/api/dropped-transcripts?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: file
    });
    const payload = await readResponse(response);

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload["error"] === "string"
          ? payload["error"]
          : `Request failed with HTTP ${response.status}`;
      if (response.status === 404 && message === "Not found") {
        throw new ApiError(
          "Dropped-transcript upload endpoint is unavailable. Restart Transcript Studio after rebuilding.",
          response.status,
          payload
        );
      }
      throw new ApiError(message, response.status, payload);
    }

    return payload as DroppedTranscriptResult;
  }

  async loadTranscript(path: string | string[]): Promise<TranscriptBundle> {
    const paths = Array.isArray(path) ? path : [path];
    return requestJson<TranscriptBundle>("/api/transcripts/load", {
      method: "POST",
      body: JSON.stringify(paths.length === 1 ? { path: paths[0] } : { paths })
    });
  }

  async exportTranscriptHtml(payload: {
    outputPath: string;
    transcriptBundle: TranscriptBundle;
  }): Promise<JsonRecord> {
    return requestJson<JsonRecord>("/api/transcripts/export-html", {
      method: "POST",
      body: JSON.stringify({
        outputPath: payload.outputPath,
        bundle: payload.transcriptBundle
      })
    });
  }

  async planProcessing(payload: ProcessingPlanRequest): Promise<ProcessingPlan> {
    return requestJson<ProcessingPlan>("/api/process/plan", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async runProcessing(payload: ProcessingPlanRequest): Promise<ProcessingRunResult> {
    return requestJson<ProcessingRunResult>("/api/process/run", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async listTranscriptionProviders(): Promise<TranscriptionProvidersResponse> {
    return requestJson<TranscriptionProvidersResponse>("/api/transcription/providers", { method: "GET" });
  }

  async planTranscription(payload: TranscriptionPlanRequest): Promise<TranscriptionPlan> {
    return requestJson<TranscriptionPlan>("/api/transcription/plan", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async startTranscriptionJobs(payload: TranscriptionPlanRequest): Promise<TranscriptionJobStartResponse> {
    return requestJson<TranscriptionJobStartResponse>("/api/transcription/jobs", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async listTranscriptionJobs(): Promise<TranscriptionJobsResponse> {
    return requestJson<TranscriptionJobsResponse>("/api/transcription/jobs", { method: "GET" });
  }

  async getTranscriptionJob(jobId: string): Promise<TranscriptionJob> {
    return requestJson<TranscriptionJob>(`/api/transcription/jobs/${encodeURIComponent(jobId)}`, { method: "GET" });
  }
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const payload = await readResponse(response);

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload["error"] === "string"
        ? payload["error"]
        : `Request failed with HTTP ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
