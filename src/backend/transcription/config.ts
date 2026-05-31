import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

import type {
  TranscriptionPlanRequest,
  TranscriptionProviderId,
  TranscriptionWarning
} from "../../shared/types.js";
import { getTranscriptionProvider, isExternalUploadProvider, isTranscriptionProviderId, unsupportedCapabilityMessage } from "./providers.js";

const EXPIRATION_WARNING_MS = 30 * 24 * 60 * 60 * 1000;

export interface TranscriptionConfigSources {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  projectRoot?: string;
  overrides?: Record<string, string | undefined>;
  now?: Date;
}

export interface ResolvedTranscriptionConfig {
  values: Record<string, string>;
  defaultProviderId?: TranscriptionProviderId;
  warnings: TranscriptionWarning[];
}

export interface ValidatedTranscriptionJobConfig {
  providerId: TranscriptionProviderId;
  model?: string;
  languageHints: string[];
  diarize: boolean;
  warnings: TranscriptionWarning[];
}

export async function resolveTranscriptionConfig(
  sources: TranscriptionConfigSources = {}
): Promise<ResolvedTranscriptionConfig> {
  const env = sources.env ?? process.env;
  const homeConfig = await readEnvFile(join(sources.homeDir ?? homedir(), ".tool-agents", "transcript-studio", ".env"));
  const localConfig = await readEnvFile(join(sources.projectRoot ?? process.cwd(), ".env"));
  const values = compactValues({
    ...compactValues(env),
    ...homeConfig,
    ...localConfig,
    ...compactValues(sources.overrides ?? {})
  });
  const defaultProviderRaw = values["TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER"];
  const warnings: TranscriptionWarning[] = [];

  if (defaultProviderRaw !== undefined && !isTranscriptionProviderId(defaultProviderRaw)) {
    warnings.push({
      code: "invalid-default-provider",
      message: `Configured default transcription provider is unsupported: ${defaultProviderRaw}`
    });
  }

  return {
    values,
    ...(isTranscriptionProviderId(defaultProviderRaw) ? { defaultProviderId: defaultProviderRaw } : {}),
    warnings
  };
}

export function validateTranscriptionJobConfig(input: {
  request: TranscriptionPlanRequest;
  config: ResolvedTranscriptionConfig;
  now?: Date;
}): ValidatedTranscriptionJobConfig {
  const providerId = input.request.providerId ?? input.config.defaultProviderId;
  if (providerId === undefined) {
    throw new Error("TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER is required when no provider is selected");
  }
  if (!isTranscriptionProviderId(providerId)) {
    throw new Error(`Unknown transcription provider: ${String(providerId)}`);
  }

  const provider = getTranscriptionProvider(providerId);
  const warnings = [...input.config.warnings];
  const languageHints = normalizeStringList(input.request.languageHints, "languageHints");
  const diarize = input.request.diarize ?? true;

  if (isExternalUploadProvider(provider) && input.request.confirmExternalUpload !== true) {
    throw new Error(`Transcription provider ${providerId} uploads source audio; confirmExternalUpload is required`);
  }

  if (input.request.failOnCapabilityGap === true && diarize) {
    const speakerDiarization = provider.capabilities.speakerDiarization;
    if (speakerDiarization === "unsupported" || speakerDiarization === "unknown") {
      throw new Error(unsupportedCapabilityMessage(providerId, "speakerDiarization", speakerDiarization));
    }
  }

  const now = input.now ?? new Date();
  switch (providerId) {
    case "soniox":
      requireValue(input.config.values, "SONIOX_API_KEY", providerId);
      validateExpiration(input.config.values, "SONIOX_API_KEY_EXPIRES_AT", providerId, now, warnings);
      return {
        providerId,
        model: input.request.model ?? requireValue(input.config.values, "SONIOX_STT_MODEL", providerId),
        languageHints,
        diarize,
        warnings
      };
    case "elevenlabs":
      requireValue(input.config.values, "ELEVENLABS_API_KEY", providerId);
      validateExpiration(input.config.values, "ELEVENLABS_API_KEY_EXPIRES_AT", providerId, now, warnings);
      return {
        providerId,
        model: input.request.model ?? requireValue(input.config.values, "ELEVENLABS_STT_MODEL", providerId),
        languageHints,
        diarize,
        warnings
      };
    case "apple-local": {
      const locale = languageHints[0] ?? requireValue(input.config.values, "TRANSCRIPT_STUDIO_APPLE_TRANSCRIPTION_LOCALE", providerId);
      requireValue(input.config.values, "TRANSCRIPT_STUDIO_APPLE_TRANSCRIBER_PATH", providerId);
      return {
        providerId,
        languageHints: [locale, ...languageHints.slice(1)],
        diarize,
        warnings
      };
    }
  }
}

function requireValue(
  values: Record<string, string>,
  key: string,
  providerId: TranscriptionProviderId
): string {
  const value = values[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required for transcription provider ${providerId}`);
  }
  return value.trim();
}

function validateExpiration(
  values: Record<string, string>,
  key: string,
  providerId: TranscriptionProviderId,
  now: Date,
  warnings: TranscriptionWarning[]
): void {
  const raw = values[key];
  if (raw === undefined || raw.trim().length === 0) {
    warnings.push({
      code: "missing-expiration-date",
      providerId,
      message: `${key} is not configured; add it so Transcript Studio can warn before the API key expires`
    });
    return;
  }
  const expiresAt = new Date(raw);
  if (!Number.isFinite(expiresAt.getTime())) {
    throw new Error(`${key} must be an ISO date or datetime`);
  }
  if (expiresAt.getTime() <= now.getTime()) {
    throw new Error(`${key} has expired`);
  }
  if (expiresAt.getTime() - now.getTime() <= EXPIRATION_WARNING_MS) {
    warnings.push({
      code: "credential-expiring-soon",
      providerId,
      message: `${key} expires on ${expiresAt.toISOString()}`
    });
  }
}

function normalizeStringList(values: unknown, fieldName: string): string[] {
  if (values === undefined) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} must be an array of strings`);
  }
  const normalized = values.map((value) => (typeof value === "string" ? value.trim() : ""));
  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${fieldName} must contain only non-empty strings`);
  }
  return normalized;
}

async function readEnvFile(path: string): Promise<Record<string, string>> {
  try {
    return parseEnvFile(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    values[key] = unquote(rawValue);
  }
  return values;
}

function compactValues(input: Record<string, string | undefined>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value.trim().length > 0) {
      output[key] = value.trim();
    }
  }
  return output;
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
