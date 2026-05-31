import type {
  TranscriptionOutputPlan,
  TranscriptionPlanRequest,
  TranscriptionCapabilities,
  TranscriptionProviderId,
  TranscriptionProviderInfo,
  TranscriptionPrivacyMode
} from "../../shared/types.js";
import type { CanonicalTranscriptionSegment } from "./normalize.js";

export interface TranscriptionProvider extends TranscriptionProviderInfo {}

export interface ProviderTranscriptionRequest {
  inputPath: string;
  outputPlan: TranscriptionOutputPlan;
  providerId: TranscriptionProviderId;
  model?: string;
  languageHints: string[];
  diarize: boolean;
  configValues: Record<string, string>;
  originalRequest: TranscriptionPlanRequest;
  onProgress?: (message: string) => void;
}

export interface ProviderTranscriptionResult {
  providerNativeJson: unknown;
  canonicalSegments: CanonicalTranscriptionSegment[];
}

export interface TranscriptionProviderAdapter {
  info: TranscriptionProvider;
  transcribe(request: ProviderTranscriptionRequest): Promise<ProviderTranscriptionResult>;
}

const PROVIDERS: TranscriptionProvider[] = [
  {
    id: "soniox",
    label: "Soniox API",
    privacyMode: "external-upload",
    capabilities: {
      speakerDiarization: "supported",
      segmentTimestamps: "supported",
      languageDetection: "supported",
      multiLanguage: "supported",
      confidenceScores: "supported",
      localOnly: false
    }
  },
  {
    id: "apple-local",
    label: "Apple local speech",
    privacyMode: "local",
    capabilities: {
      speakerDiarization: "unsupported",
      segmentTimestamps: "supported",
      languageDetection: "unsupported",
      multiLanguage: "unknown",
      confidenceScores: "supported",
      localOnly: true
    }
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs API",
    privacyMode: "external-upload",
    capabilities: {
      speakerDiarization: "supported",
      segmentTimestamps: "supported",
      languageDetection: "supported",
      multiLanguage: "supported",
      confidenceScores: "supported",
      localOnly: false
    }
  }
];

export function listTranscriptionProviders(): TranscriptionProvider[] {
  return PROVIDERS.map((provider) => ({
    ...provider,
    capabilities: { ...provider.capabilities }
  }));
}

export function getTranscriptionProvider(providerId: TranscriptionProviderId): TranscriptionProvider {
  const provider = PROVIDERS.find((candidate) => candidate.id === providerId);
  if (provider === undefined) {
    throw new Error(`Unknown transcription provider: ${providerId}`);
  }
  return {
    ...provider,
    capabilities: { ...provider.capabilities }
  };
}

export function isTranscriptionProviderId(value: unknown): value is TranscriptionProviderId {
  return value === "soniox" || value === "apple-local" || value === "elevenlabs";
}

export function isExternalUploadProvider(provider: Pick<TranscriptionProviderInfo, "privacyMode">): boolean {
  return provider.privacyMode === "external-upload";
}

export function unsupportedCapabilityMessage(
  providerId: TranscriptionProviderId,
  capability: keyof TranscriptionCapabilities,
  value: "unsupported" | "unknown"
): string {
  return `Transcription provider ${providerId} has ${value} ${capability} capability`;
}

export function privacyModeLabel(privacyMode: TranscriptionPrivacyMode): string {
  return privacyMode === "local" ? "local/private" : "external upload";
}
