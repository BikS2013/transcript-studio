import { writeFile } from "node:fs/promises";

import type {
  TranscriptionJob,
  TranscriptionJobOutput,
  TranscriptionJobStartResponse,
  TranscriptionJobsResponse,
  TranscriptionPlan,
  TranscriptionPlanRequest,
  TranscriptionProvidersResponse,
  TranscriptionProviderId
} from "../../shared/types.js";
import {
  resolveTranscriptionConfig,
  type ResolvedTranscriptionConfig,
  type TranscriptionConfigSources,
  validateTranscriptionJobConfig
} from "./config.js";
import { writeCanonicalJsonl } from "./normalize.js";
import { planTranscriptionOutputs } from "./output.js";
import {
  getTranscriptionProvider,
  listTranscriptionProviders,
  privacyModeLabel,
  type ProviderTranscriptionRequest,
  type TranscriptionProviderAdapter
} from "./providers.js";
import { createAppleLocalAdapter } from "./providers/apple-local.js";
import { createElevenLabsAdapter } from "./providers/elevenlabs.js";
import { createSonioxAdapter } from "./providers/soniox.js";

const jobs = new Map<string, TranscriptionJob>();

export async function getTranscriptionProvidersResponse(
  sources: TranscriptionConfigSources = {}
): Promise<TranscriptionProvidersResponse> {
  const config = await resolveTranscriptionConfig(sources);
  return {
    providers: listTranscriptionProviders(),
    ...(config.defaultProviderId === undefined ? {} : { defaultProviderId: config.defaultProviderId }),
    warnings:
      config.defaultProviderId === undefined
        ? [
            ...config.warnings,
            {
              code: "missing-default-provider",
              message: "TRANSCRIPT_STUDIO_TRANSCRIPTION_DEFAULT_PROVIDER is not configured"
            }
          ]
        : config.warnings
  };
}

export async function buildTranscriptionPlan(input: {
  request: TranscriptionPlanRequest;
  configSources?: TranscriptionConfigSources;
  now?: Date;
}): Promise<TranscriptionPlan> {
  const { config, providerId, model, languageHints, diarize, warnings } = await validatePlanInput(input);
  const provider = getTranscriptionProvider(providerId);
  const outputs = await planTranscriptionOutputs({
    inputPaths: input.request.inputPaths,
    providerId,
    ...(input.now === undefined ? {} : { now: input.now })
  });

  return {
    provider,
    ...(model === undefined ? {} : { model }),
    languageHints,
    diarize,
    outputs,
    warnings: [
      ...warnings,
      ...(provider.privacyMode === "external-upload"
        ? [
            {
              code: "external-upload-confirmed",
              providerId: provider.id,
              message: `${provider.label} uses ${privacyModeLabel(provider.privacyMode)} for source audio`
            }
          ]
        : [])
    ]
  };
}

export async function startTranscriptionJobs(input: {
  request: TranscriptionPlanRequest;
  configSources?: TranscriptionConfigSources;
  now?: Date;
}): Promise<TranscriptionJobStartResponse> {
  const plan = await buildTranscriptionPlan(input);
  const config = await resolveTranscriptionConfig(input.configSources);
  const adapter = adapterFor(plan.provider.id);
  const started = plan.outputs.map((output) => {
    const nowIso = new Date().toISOString();
    const job: TranscriptionJob = {
      id: `transcription-job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      state: "queued",
      providerId: plan.provider.id,
      inputPaths: [output.inputPath],
      progressText: "Queued.",
      warnings: plan.warnings,
      outputs: [output],
      createdAtIso: nowIso,
      updatedAtIso: nowIso
    };
    jobs.set(job.id, job);
    void runTranscriptionJob({
      jobId: job.id,
      adapter,
      request: input.request,
      config,
      plan,
      output
    });
    return job;
  });
  return { jobs: started };
}

export function listTranscriptionJobs(): TranscriptionJobsResponse {
  return { jobs: Array.from(jobs.values()) };
}

export function getTranscriptionJob(jobId: string): TranscriptionJob {
  const job = jobs.get(jobId);
  if (job === undefined) {
    throw new Error(`Unknown transcription job: ${jobId}`);
  }
  return job;
}

async function validatePlanInput(input: {
  request: TranscriptionPlanRequest;
  configSources?: TranscriptionConfigSources;
  now?: Date;
}): Promise<{
  config: ResolvedTranscriptionConfig;
  providerId: TranscriptionProviderId;
  model?: string;
  languageHints: string[];
  diarize: boolean;
  warnings: TranscriptionPlan["warnings"];
}> {
  const config = await resolveTranscriptionConfig(input.configSources);
  const jobConfig = validateTranscriptionJobConfig({
    request: input.request,
    config,
    ...(input.now === undefined ? {} : { now: input.now })
  });
  return {
    config,
    providerId: jobConfig.providerId,
    ...(jobConfig.model === undefined ? {} : { model: jobConfig.model }),
    languageHints: jobConfig.languageHints,
    diarize: jobConfig.diarize,
    warnings: jobConfig.warnings
  };
}

async function runTranscriptionJob(input: {
  jobId: string;
  adapter: TranscriptionProviderAdapter;
  request: TranscriptionPlanRequest;
  config: ResolvedTranscriptionConfig;
  plan: TranscriptionPlan;
  output: TranscriptionJobOutput;
}): Promise<void> {
  updateJob(input.jobId, {
    state: "running",
    progressText: `Starting ${input.plan.provider.label} transcription.`
  });
  try {
    const providerRequest: ProviderTranscriptionRequest = {
      inputPath: input.output.inputPath,
      outputPlan: input.output,
      providerId: input.plan.provider.id,
      ...(input.plan.model === undefined ? {} : { model: input.plan.model }),
      languageHints: input.plan.languageHints,
      diarize: input.plan.diarize,
      configValues: input.config.values,
      originalRequest: input.request,
      onProgress: (message) => updateJob(input.jobId, { progressText: message })
    };
    const result = await input.adapter.transcribe(providerRequest);
    updateJob(input.jobId, {
      state: "writing",
      progressText: "Writing canonical JSONL and provider-native JSON."
    });
    await writeFile(input.output.providerJsonPath, `${JSON.stringify(result.providerNativeJson, null, 2)}\n`, "utf8");
    await writeFile(input.output.canonicalJsonlPath, writeCanonicalJsonl(result.canonicalSegments), "utf8");
    updateJob(input.jobId, {
      state: "succeeded",
      progressText: `Transcription complete: ${input.output.canonicalJsonlPath}`,
      outputs: [
        {
          ...input.output,
          canonicalSegmentCount: result.canonicalSegments.length
        }
      ]
    });
  } catch (error) {
    updateJob(input.jobId, {
      state: "failed",
      error: error instanceof Error ? error.message : String(error),
      progressText: "Transcription failed."
    });
  }
}

function adapterFor(providerId: TranscriptionProviderId): TranscriptionProviderAdapter {
  switch (providerId) {
    case "soniox":
      return createSonioxAdapter();
    case "elevenlabs":
      return createElevenLabsAdapter();
    case "apple-local":
      return createAppleLocalAdapter();
  }
}

function updateJob(jobId: string, patch: Partial<TranscriptionJob>): void {
  const current = getTranscriptionJob(jobId);
  jobs.set(jobId, {
    ...current,
    ...patch,
    updatedAtIso: new Date().toISOString()
  });
}
