import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export async function jsonRequest(input: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(input, init);
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new Error(apiErrorMessage(input, response.status, payload));
  }
  return payload;
}

export async function appendFile(form: FormData, fieldName: string, path: string, contentType = "audio/mp4"): Promise<void> {
  const buffer = await readFile(path);
  form.append(fieldName, new Blob([buffer], { type: contentType }), basename(path));
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function apiErrorMessage(input: string, status: number, payload: unknown): string {
  const detail = isRecord(payload)
    ? stringField(payload, "message") ?? stringField(payload, "error") ?? stringField(payload, "detail")
    : undefined;
  return detail === undefined
    ? `Provider request failed with HTTP ${status}: ${input}`
    : `Provider request failed with HTTP ${status}: ${detail}`;
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
