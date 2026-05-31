import { StudioApiClient } from "./api/client";
import { classifyDroppedJsonlFiles } from "./drop/jsonl";
import { classifyDroppedM4aFiles } from "./drop/m4a";
import {
  clampPanelWidth,
  PROCESSING_RESIZE,
  resizeWidthFromPointer,
  SIDEBAR_RESIZE,
  type ResizeTarget
} from "./layout/resize";
import "./styles/app.css";
import { PRODUCT_NAME, SESSION_MANIFEST_VERSION } from "../shared/app";
import type {
  AudioTrack,
  HealthStatus,
  ProcessingKind,
  ProcessingPlan,
  ProcessingPlanRequest,
  ProcessingRunResult,
  SessionManifest,
  TrackStatus,
  TranscriptionJob,
  TranscriptionPlan,
  TranscriptionProviderId,
  TranscriptionProviderInfo,
  TranscriptBundle,
  TranscriptParagraph
} from "../shared/types";
import { formatTimestamp, msToSeconds, secondsToMs } from "../shared/time/format";

const SYNC_TOLERANCE_MS = 100;
const SEEK_STEP_MS = 5_000;

interface TrackRuntime {
  audio: HTMLAudioElement;
  gain?: GainNode;
  source?: MediaElementAudioSourceNode;
}

interface AppState {
  health: HealthStatus | undefined;
  tracks: AudioTrack[];
  transcriptPath: string;
  transcriptBundle: TranscriptBundle | undefined;
  trackPathDraft: string;
  transcriptSearch: string;
  transcriptSpeakerFilter: string;
  selectedTrackId: string | undefined;
  transportStatus: "idle" | "playing" | "paused" | "error";
  currentMs: number;
  durationMs: number;
  driftByTrackId: Record<string, number>;
  trackDropActive: boolean;
  transcriptDropActive: boolean;
  statusMessage: string;
  errorMessage: string;
  processingKind: ProcessingKind;
  processingOutputPath: string;
  processingPlan: ProcessingPlan | undefined;
  processingRunResult: ProcessingRunResult | undefined;
  exportOutputPath: string;
  exportResult: Record<string, unknown> | undefined;
  transcriptionProviders: TranscriptionProviderInfo[];
  transcriptionDefaultProviderId: TranscriptionProviderId | undefined;
  transcriptionProviderId: TranscriptionProviderId | "";
  transcriptionScope: "active" | "selected" | "session";
  transcriptionLanguageDraft: string;
  transcriptionModelDraft: string;
  transcriptionDiarize: boolean;
  transcriptionConfirmExternalUpload: boolean;
  transcriptionFailOnCapabilityGap: boolean;
  transcriptionPlan: TranscriptionPlan | undefined;
  transcriptionJobs: TranscriptionJob[];
  sidebarWidthPx: number;
  processingWidthPx: number;
}

interface ResizeSession {
  target: ResizeTarget;
  startClientX: number;
  startWidth: number;
}

const api = new StudioApiClient();
const root = document.querySelector<HTMLElement>("#app");

if (root === null) {
  throw new Error("Missing #app mount point");
}

const appRoot = root;

const state: AppState = {
  tracks: [],
  health: undefined,
  transcriptPath: "",
  transcriptBundle: undefined,
  trackPathDraft: "",
  transcriptSearch: "",
  transcriptSpeakerFilter: "",
  selectedTrackId: undefined,
  transportStatus: "idle",
  currentMs: 0,
  durationMs: 0,
  driftByTrackId: {},
  trackDropActive: false,
  transcriptDropActive: false,
  statusMessage: "Workspace ready. Probe tracks or load a transcript to begin.",
  errorMessage: "",
  processingKind: "mix",
  processingOutputPath: "",
  processingPlan: undefined,
  processingRunResult: undefined,
  exportOutputPath: "",
  exportResult: undefined,
  transcriptionProviders: [],
  transcriptionDefaultProviderId: undefined,
  transcriptionProviderId: "",
  transcriptionScope: "active",
  transcriptionLanguageDraft: "",
  transcriptionModelDraft: "",
  transcriptionDiarize: true,
  transcriptionConfirmExternalUpload: false,
  transcriptionFailOnCapabilityGap: false,
  transcriptionPlan: undefined,
  transcriptionJobs: [],
  sidebarWidthPx: 340,
  processingWidthPx: 360
};

let audioContext: AudioContext | undefined;
const runtimes = new Map<string, TrackRuntime>();
let rafId = 0;
let resizeSession: ResizeSession | undefined;

void boot();

async function boot(): Promise<void> {
  render();
  try {
    state.health = await api.health();
    const transcription = await api.listTranscriptionProviders();
    state.transcriptionProviders = transcription.providers;
    state.transcriptionDefaultProviderId = transcription.defaultProviderId;
    state.transcriptionProviderId = transcription.defaultProviderId ?? transcription.providers[0]?.id ?? "";
    state.statusMessage = state.health.ok
      ? "Backend ready. FFmpeg and ffprobe prerequisites are available."
      : "Backend reachable, but one or more prerequisites need attention.";
  } catch (error) {
    state.errorMessage = errorToMessage(error);
    state.statusMessage = "Backend health check failed.";
  }
  render();
}

function render(): void {
  applyLayoutSizing();
  appRoot.innerHTML = `
    <section class="studio-shell">
      <header class="topbar">
        <div class="brand">
          <strong>${PRODUCT_NAME}</strong>
          <span>Local multi-track review workspace</span>
        </div>
        <div class="topbar-actions">
          ${renderHealth()}
          <button type="button" data-action="health">Check</button>
          <button type="button" data-action="reset">Reset</button>
        </div>
      </header>

      <main class="workspace">
        <aside class="sidebar">
          ${renderTrackPanel()}
          ${renderSessionPanel()}
        </aside>
        ${renderResizeHandle("sidebar", state.sidebarWidthPx, SIDEBAR_RESIZE)}
        <section class="review">
          ${renderTransport()}
          <div class="review-grid">
            ${renderTranscriptPanel()}
            ${renderResizeHandle("processing", state.processingWidthPx, PROCESSING_RESIZE)}
            ${renderProcessingPanel()}
          </div>
        </section>
      </main>
    </section>
  `;
}

function renderResizeHandle(target: ResizeTarget, value: number, bounds: { min: number; max: number }): string {
  const label = target === "sidebar" ? "Resize left panel" : "Resize right panel";
  return `
    <div
      class="resize-handle"
      role="separator"
      tabindex="0"
      aria-label="${label}"
      aria-orientation="vertical"
      aria-valuemin="${bounds.min}"
      aria-valuemax="${bounds.max}"
      aria-valuenow="${value}"
      data-action="start-resize"
      data-resize-target="${target}"
      title="${label}"
    ></div>
  `;
}

function renderHealth(): string {
  if (state.health === undefined) {
    return `<span class="status-pill pending">Health unknown</span>`;
  }

  const label = state.health.ok ? "Ready" : "Prerequisite issue";
  const tone = state.health.ok ? "ok" : "warn";
  return `<span class="status-pill ${tone}">${escapeHtml(label)}</span>`;
}

function renderTrackPanel(): string {
  const tracks = state.tracks.length
    ? state.tracks.map((track) => renderTrack(track)).join("")
    : `<div class="empty">No tracks probed yet.</div>`;
  const dropClass = state.trackDropActive ? " drop-active" : "";

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Tracks</h2>
        <span>${state.tracks.length} loaded</span>
      </div>
      <div class="panel-body">
        <div class="drop-target${dropClass}" data-drop-target="tracks">
          <strong>Drop M4A files</strong>
          <span>One or more local recordings</span>
        </div>
        <input class="visually-hidden-file" type="file" data-file-picker="tracks" accept=".m4a,audio/mp4" multiple>
        <label class="field">
          <span>Audio path</span>
          <input data-field="trackPathDraft" value="${escapeAttr(state.trackPathDraft)}" placeholder="/absolute/path/audio.m4a">
        </label>
        <div class="button-row">
          <button type="button" data-action="choose-track-files">Browse M4A files</button>
          <button type="button" class="primary" data-action="probe">Probe</button>
          <button type="button" data-action="select-all">Select all</button>
          <button type="button" data-action="clear-solo">Clear solo</button>
        </div>
        <div class="track-list">${tracks}</div>
      </div>
    </section>
  `;
}

function renderTrack(track: AudioTrack): string {
  const drift = state.driftByTrackId[track.id] ?? 0;
  const driftTone = Math.abs(drift) <= SYNC_TOLERANCE_MS ? "ok" : "warn";
  const isActive = state.selectedTrackId === track.id ? " active" : "";
  const duration = formatTimestamp(secondsToMs(track.durationSec), { milliseconds: true });
  const metadata = [
    track.codec,
    track.sampleRate ? `${track.sampleRate} Hz` : "",
    track.channels ? `${track.channels} ch` : "",
    duration
  ].filter(Boolean);

  return `
    <article class="track-card${isActive}" data-track-id="${escapeAttr(track.id)}">
      <div class="track-main">
        <label class="check-line">
          <input type="checkbox" data-action="toggle-selected" data-track-id="${escapeAttr(track.id)}" ${track.selected ? "checked" : ""}>
          <span class="track-title">${escapeHtml(track.displayName || track.fileName)}</span>
        </label>
        <button type="button" class="icon-button" title="Make operation track" data-action="activate-track" data-track-id="${escapeAttr(track.id)}">◎</button>
      </div>
      <div class="track-path">${escapeHtml(track.path)}</div>
      <div class="track-meta">${escapeHtml(metadata.join(" · ") || "Metadata pending")}</div>
      <div class="track-controls">
        <button type="button" class="${track.muted ? "toggle on" : "toggle"}" data-action="toggle-mute" data-track-id="${escapeAttr(track.id)}">Mute</button>
        <button type="button" class="${track.solo ? "toggle on" : "toggle"}" data-action="toggle-solo" data-track-id="${escapeAttr(track.id)}">Solo</button>
        <label class="offset-control">
          <span>Offset ms</span>
          <input type="number" step="10" value="${track.offsetMs}" data-action="set-offset" data-track-id="${escapeAttr(track.id)}">
        </label>
      </div>
      <div class="track-footer">
        <span class="status-dot ${statusTone(track.status)}"></span>
        <span>${escapeHtml(track.status)}</span>
        <span class="${driftTone}">Drift ${formatSignedMs(drift)}</span>
      </div>
      ${track.error ? `<div class="inline-error">${escapeHtml(track.error)}</div>` : ""}
    </article>
  `;
}

function renderSessionPanel(): string {
  const manifest = buildSessionManifest();
  const sourceCount = manifest.transcriptBundle?.sources.length ?? 0;
  const outputCount = manifest.derivedOutputs.length;
  const trackCount = manifest.tracks.length;
  const prereqRows =
    state.health === undefined
      ? "Health not checked."
      : [
          prereqLine("ffmpeg", state.health.ffmpeg.ok, state.health.ffmpeg.versionLine, state.health.ffmpeg.error),
          prereqLine("ffprobe", state.health.ffprobe.ok, state.health.ffprobe.versionLine, state.health.ffprobe.error)
        ].join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Session</h2>
        <span>${escapeHtml(state.transportStatus)}</span>
      </div>
      <div class="panel-body stack">
        <div class="session-stats">
          <span><strong>${trackCount}</strong> tracks</span>
          <span><strong>${sourceCount}</strong> transcript files</span>
          <span><strong>${outputCount}</strong> outputs</span>
        </div>
        <div class="message ${state.errorMessage ? "error" : ""}">
          ${escapeHtml(state.errorMessage || state.statusMessage)}
        </div>
        <div class="prereq-box">${prereqRows}</div>
      </div>
    </section>
  `;
}

function renderTransport(): string {
  const selectedTracks = getSelectedTracks();
  const maxDuration = state.durationMs > 0 ? state.durationMs : getMaxDurationMs();
  const progress = maxDuration > 0 ? Math.min(100, (state.currentMs / maxDuration) * 100) : 0;
  const driftRows = selectedTracks.length
    ? selectedTracks
        .map((track) => {
          const drift = state.driftByTrackId[track.id] ?? 0;
          const tone = Math.abs(drift) <= SYNC_TOLERANCE_MS ? "ok" : "warn";
          return `
            <div>${escapeHtml(track.displayName)}</div>
            <div class="${tone}" data-live-drift="${escapeAttr(track.id)}">${formatSignedMs(drift)}</div>
            <div data-live-status="${escapeAttr(track.id)}">${escapeHtml(track.status)}</div>
          `;
        })
        .join("")
    : `<div class="empty-grid">Select one or more tracks for synchronized playback.</div>`;

  return `
    <section class="transport-panel">
      <div class="transport-top">
        <div>
          <div class="timecode" data-live-timecode>${formatTimestamp(state.currentMs, { milliseconds: true })}</div>
          <div class="muted-text">Selected-track operation · tolerance ${SYNC_TOLERANCE_MS} ms</div>
        </div>
        <div class="transport-buttons">
          <button type="button" class="icon-button wide" title="Rewind" data-action="rewind">↶ ${SEEK_STEP_MS / 1000}s</button>
          <button type="button" class="primary" data-action="play">Play</button>
          <button type="button" data-action="pause">Pause</button>
          <button type="button" data-action="resume">Resume</button>
          <button type="button" class="icon-button wide" title="Fast forward" data-action="forward">${SEEK_STEP_MS / 1000}s ↷</button>
        </div>
      </div>
      <label class="timeline">
        <input type="range" min="0" max="${Math.max(maxDuration, 1)}" value="${Math.min(state.currentMs, maxDuration)}" data-action="seek" data-live-seek>
        <span style="width: ${progress}%" data-live-progress></span>
      </label>
      <div class="drift-grid">
        <div class="grid-head">Track</div>
        <div class="grid-head">Drift</div>
        <div class="grid-head">Status</div>
        ${driftRows}
      </div>
    </section>
  `;
}

function renderTranscriptPanel(): string {
  const bundle = state.transcriptBundle;
  const speakers = getSpeakers(bundle);
  const speakerOptions = [`<option value="">All speakers</option>`]
    .concat(
      speakers.map(
        (speaker) =>
          `<option value="${escapeAttr(speaker)}" ${speaker === state.transcriptSpeakerFilter ? "selected" : ""}>${escapeHtml(speaker)}</option>`
      )
    )
    .join("");
  const paragraphs = getVisibleParagraphs();
  const rows = paragraphs.length
    ? paragraphs.map((paragraph) => renderParagraph(paragraph)).join("")
    : `<div class="empty">No transcript paragraphs match the current filters.</div>`;
  const errors = bundle?.sources.flatMap((source) => source.errors) ?? [];
  const errorRows = errors.length
    ? `<div class="parse-errors">${errors
        .map(
          (error) =>
            `<div><strong>${escapeHtml(error.path)}:${error.lineNumber}</strong> ${escapeHtml(error.message)}</div>`
        )
        .join("")}</div>`
    : "";
  const dropClass = state.transcriptDropActive ? " drop-active" : "";

  return `
    <section class="panel transcript-panel">
      <div class="panel-header">
        <h2>Transcript</h2>
        <span>${bundle ? `${bundle.paragraphs.length} paragraphs` : "Not loaded"}</span>
      </div>
      <div class="panel-body">
        <div class="drop-target${dropClass}" data-drop-target="transcripts">
          <strong>Drop JSONL transcripts</strong>
          <span>One or more local transcript files</span>
        </div>
        <input class="visually-hidden-file" type="file" data-file-picker="transcripts" accept=".jsonl,application/json" multiple>
        <div class="form-grid">
          <label class="field">
            <span>JSONL path</span>
            <input data-field="transcriptPath" value="${escapeAttr(state.transcriptPath)}" placeholder="/absolute/path/transcript.jsonl">
          </label>
          <button type="button" data-action="choose-transcript-files">Browse JSONL files</button>
          <button type="button" class="primary" data-action="load-transcript">Load</button>
        </div>
        <div class="filter-bar">
          <input class="search-input" data-field="transcriptSearch" value="${escapeAttr(state.transcriptSearch)}" placeholder="Search text, speaker, source">
          <select data-field="transcriptSpeakerFilter">${speakerOptions}</select>
        </div>
        ${errorRows}
        <div class="paragraph-list">${rows}</div>
      </div>
    </section>
  `;
}

function renderParagraph(paragraph: TranscriptParagraph): string {
  const isActive = paragraph.startMs <= state.currentMs && state.currentMs <= paragraph.endMs;
  const label = [paragraph.speaker, paragraph.source, paragraph.language].filter(Boolean).join(" · ");
  return `
    <article class="paragraph-row ${isActive ? "active" : ""}" data-action="seek-paragraph" data-start-ms="${paragraph.startMs}" data-end-ms="${paragraph.endMs}">
      <div class="paragraph-time">${formatTimestamp(paragraph.startMs, { milliseconds: true })}</div>
      <div class="paragraph-content">
        <div class="paragraph-label">${escapeHtml(label || "Transcript")}</div>
        <p>${highlightText(paragraph.text, state.transcriptSearch)}</p>
      </div>
    </article>
  `;
}

function renderProcessingPanel(): string {
  const selected = getSelectedTracks();
  const command = state.processingPlan?.command;
  const warnings = state.processingPlan?.warnings ?? [];
  const commandBlock = command
    ? `${command.executable}\n${command.args.map((arg) => `  ${arg}`).join("\n")}`
    : "No processing plan requested yet.";
  const warningBlock = warnings.length
    ? warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")
    : `<li>No warnings returned.</li>`;
  const runValue = state.processingRunResult
    ? `Exit ${state.processingRunResult.exitCode}; ${state.processingRunResult.sizeBytes} bytes written to ${state.processingRunResult.outputPath}`
    : "No processing job executed yet.";
  const exportValue = state.exportResult ? stringifyResult(state.exportResult) : "No export requested yet.";

  return `
    <section class="panel processing-panel">
      <div class="panel-header">
        <h2>Processing</h2>
        <span>${selected.length} selected inputs</span>
      </div>
      <div class="panel-body stack">
        <label class="field">
          <span>Plan kind</span>
          <select data-field="processingKind">
            ${renderKindOption("mix", "Mixed review")}
            ${renderKindOption("source-separated", "Source separated")}
            ${renderKindOption("denoise", "Denoise preview")}
            ${renderKindOption("loudness", "Loudness stats")}
          </select>
        </label>
        <label class="field">
          <span>Output path</span>
          <input data-field="processingOutputPath" value="${escapeAttr(state.processingOutputPath)}" placeholder="/absolute/path/derived-output.m4a">
        </label>
        <div class="button-row">
          <button type="button" class="primary" data-action="plan-processing">Request FFmpeg plan</button>
          <button type="button" data-action="run-processing">Run FFmpeg job</button>
        </div>
        <div class="job-log" aria-label="Processing command plan">${escapeHtml(commandBlock)}</div>
        <ul class="warning-list">${warningBlock}</ul>
        <div class="result-box">${escapeHtml(runValue)}</div>
        <div class="divider"></div>
        ${renderTranscriptionPanel()}
        <div class="divider"></div>
        <label class="field">
          <span>HTML transcript output</span>
          <input data-field="exportOutputPath" value="${escapeAttr(state.exportOutputPath)}" placeholder="/absolute/path/transcript.html">
        </label>
        <button type="button" data-action="export-html">Export HTML transcript</button>
        <div class="result-box">${escapeHtml(exportValue)}</div>
      </div>
    </section>
  `;
}

function renderKindOption(kind: ProcessingKind, label: string): string {
  return `<option value="${kind}" ${kind === state.processingKind ? "selected" : ""}>${label}</option>`;
}

function renderTranscriptionPanel(): string {
  const selectedProvider = getSelectedTranscriptionProvider();
  const providerOptions = state.transcriptionProviders.length
    ? state.transcriptionProviders
        .map(
          (provider) =>
            `<option value="${provider.id}" ${provider.id === state.transcriptionProviderId ? "selected" : ""}>${escapeHtml(provider.label)}</option>`
        )
        .join("")
    : `<option value="">No providers loaded</option>`;
  const capabilities = selectedProvider
    ? Object.entries(selectedProvider.capabilities)
        .filter(([key]) => key !== "localOnly")
        .map(([key, value]) => `<span class="capability ${String(value)}">${escapeHtml(key)}: ${escapeHtml(String(value))}</span>`)
        .join("")
    : `<span class="muted-text">Capabilities unavailable.</span>`;
  const uploadConsent =
    selectedProvider?.privacyMode === "external-upload"
      ? `<label class="check-line consent-line">
          <input type="checkbox" data-action="toggle-transcription-consent" ${state.transcriptionConfirmExternalUpload ? "checked" : ""}>
          <span>Allow this job to upload source audio to ${escapeHtml(selectedProvider.label)}</span>
        </label>`
      : `<div class="privacy-note">Local/private transcription provider selected.</div>`;
  const planValue = state.transcriptionPlan ? stringifyResult(state.transcriptionPlan as unknown as Record<string, unknown>) : "No transcription plan requested yet.";
  const jobs = state.transcriptionJobs.length
    ? state.transcriptionJobs.map((job) => renderTranscriptionJob(job)).join("")
    : `<div class="empty">No transcription jobs started yet.</div>`;

  return `
    <section class="transcription-section">
      <div class="subsection-header">
        <h3>Transcription</h3>
        <span>${escapeHtml(selectedProvider?.privacyMode ?? "not configured")}</span>
      </div>
      <label class="field">
        <span>Provider</span>
        <select data-field="transcriptionProviderId">${providerOptions}</select>
      </label>
      <div class="capability-list">${capabilities}</div>
      <label class="field">
        <span>Scope</span>
        <select data-field="transcriptionScope">
          ${renderTranscriptionScopeOption("active", "Active track")}
          ${renderTranscriptionScopeOption("selected", "Selected tracks")}
          ${renderTranscriptionScopeOption("session", "Entire session")}
        </select>
      </label>
      <label class="field">
        <span>Language or locale</span>
        <input data-field="transcriptionLanguageDraft" value="${escapeAttr(state.transcriptionLanguageDraft)}" placeholder="en or en-US">
      </label>
      <label class="field">
        <span>Model override</span>
        <input data-field="transcriptionModelDraft" value="${escapeAttr(state.transcriptionModelDraft)}" placeholder="Provider model id">
      </label>
      <div class="two-checks">
        <label class="check-line">
          <input type="checkbox" data-action="toggle-transcription-diarize" ${state.transcriptionDiarize ? "checked" : ""}>
          <span>Diarize</span>
        </label>
        <label class="check-line">
          <input type="checkbox" data-action="toggle-transcription-capability-gap" ${state.transcriptionFailOnCapabilityGap ? "checked" : ""}>
          <span>Fail on capability gap</span>
        </label>
      </div>
      ${uploadConsent}
      <div class="button-row">
        <button type="button" data-action="plan-transcription">Plan transcription</button>
        <button type="button" class="primary" data-action="start-transcription">Start transcription</button>
        <button type="button" data-action="refresh-transcription-jobs">Refresh jobs</button>
      </div>
      <div class="job-log compact" aria-label="Transcription plan">${escapeHtml(planValue)}</div>
      <div class="transcription-jobs">${jobs}</div>
    </section>
  `;
}

function renderTranscriptionScopeOption(value: AppState["transcriptionScope"], label: string): string {
  return `<option value="${value}" ${value === state.transcriptionScope ? "selected" : ""}>${label}</option>`;
}

function renderTranscriptionJob(job: TranscriptionJob): string {
  const outputs = job.outputs
    .map(
      (output) =>
        `<div class="job-output">
          <button type="button" data-action="load-generated-transcript" data-transcript-path="${escapeAttr(output.canonicalJsonlPath)}">Load JSONL</button>
          <span>${escapeHtml(output.canonicalJsonlPath)}</span>
        </div>`
    )
    .join("");
  return `
    <article class="transcription-job ${job.state}">
      <div><strong>${escapeHtml(job.providerId ?? "provider")}</strong> ${escapeHtml(job.state)}</div>
      <div>${escapeHtml(job.progressText)}</div>
      ${job.error ? `<div class="inline-error">${escapeHtml(job.error)}</div>` : ""}
      ${outputs}
    </article>
  `;
}

root.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  const field = target.dataset["field"];
  if (field) {
    setField(field, target.value);
    return;
  }

  const action = target.dataset["action"];
  if (action === "set-offset") {
    updateTrack(target.dataset["trackId"] ?? "", {
      offsetMs: Number(target.value)
    });
    syncAudioRouting();
    render();
  }

  if (action === "seek" && target instanceof HTMLInputElement) {
    void seekTo(Number(target.value));
  }
});

root.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const filePicker = target.dataset["filePicker"];
  if (filePicker === "tracks") {
    const files = target.files;
    target.value = "";
    void handleTrackFiles(files).catch((error) => {
      state.errorMessage = errorToMessage(error);
      state.statusMessage = "Selected M4A files could not be loaded.";
      render();
    });
    return;
  }
  if (filePicker === "transcripts") {
    const files = target.files;
    target.value = "";
    void handleTranscriptFiles(files).catch((error) => {
      state.errorMessage = errorToMessage(error);
      state.statusMessage = "Selected transcript files could not be loaded.";
      render();
    });
    return;
  }

  const action = target.dataset["action"];
  if (action === "toggle-selected") {
    const trackId = target.dataset["trackId"] ?? "";
    updateTrack(trackId, { selected: target.checked });
    if (target.checked && state.selectedTrackId === undefined) {
      state.selectedTrackId = trackId;
    }
    syncAudioRouting();
    updateDuration();
    render();
  }
});

root.addEventListener("click", (event) => {
  const target = event.target;
  const actionNode =
    target instanceof HTMLElement ? target.closest<HTMLElement>("[data-action]") : null;
  if (actionNode === null) {
    return;
  }

  const action = actionNode.dataset["action"] ?? "";
  const trackId = actionNode.dataset["trackId"] ?? "";

  if (actionNode instanceof HTMLInputElement && action === "toggle-selected") {
    return;
  }
  if (action === "start-resize") {
    return;
  }

  void handleAction(action, trackId, actionNode);
});

root.addEventListener("pointerdown", (event) => {
  const target = event.target;
  const handle = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-action="start-resize"]') : null;
  if (handle === null) {
    return;
  }
  const resizeTarget = resizeTargetFromNode(handle);
  if (resizeTarget === undefined) {
    return;
  }
  event.preventDefault();
  resizeSession = {
    target: resizeTarget,
    startClientX: event.clientX,
    startWidth: resizeTarget === "sidebar" ? state.sidebarWidthPx : state.processingWidthPx
  };
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-panels");
});

window.addEventListener("pointermove", (event) => {
  if (resizeSession === undefined) {
    return;
  }
  updatePanelWidthFromPointer(resizeSession, event.clientX);
});

window.addEventListener("pointerup", () => {
  finishPanelResize();
});

window.addEventListener("pointercancel", () => {
  finishPanelResize();
});

function finishPanelResize(): void {
  if (resizeSession === undefined) {
    return;
  }
  resizeSession = undefined;
  document.body.classList.remove("is-resizing-panels");
  render();
}

root.addEventListener("keydown", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.dataset["action"] !== "start-resize") {
    return;
  }
  const resizeTarget = resizeTargetFromNode(target);
  if (resizeTarget === undefined) {
    return;
  }
  const step = event.shiftKey ? 40 : 16;
  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  if (direction === 0) {
    return;
  }
  event.preventDefault();
  const signedStep = resizeTarget === "sidebar" ? direction * step : -direction * step;
  setPanelWidth(resizeTarget, currentPanelWidth(resizeTarget) + signedStep);
  render();
});

root.addEventListener("dragover", (event) => {
  const dropTarget = dropTargetFromEvent(event);
  if (dropTarget === null) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
  const kind = dropTargetKind(dropTarget);
  if (kind !== undefined && !isDropActive(kind)) {
    setDropActive(kind, true);
    render();
  }
});

root.addEventListener("dragleave", (event) => {
  const dropTarget = dropTargetFromEvent(event);
  if (dropTarget === null) {
    return;
  }
  const related = event.relatedTarget;
  if (related instanceof Node && dropTarget.contains(related)) {
    return;
  }
  const kind = dropTargetKind(dropTarget);
  if (kind !== undefined) {
    setDropActive(kind, false);
  }
  render();
});

root.addEventListener("drop", (event) => {
  const dropTarget = dropTargetFromEvent(event);
  if (dropTarget === null) {
    return;
  }
  event.preventDefault();
  const kind = dropTargetKind(dropTarget);
  if (kind === undefined) {
    return;
  }
  setDropActive(kind, false);
  const handler = kind === "tracks" ? handleTrackFiles : handleTranscriptFiles;
  void handler(event.dataTransfer?.files).catch((error) => {
    state.errorMessage = errorToMessage(error);
    state.statusMessage = kind === "tracks" ? "Dropped M4A files could not be loaded." : "Dropped transcript files could not be loaded.";
    render();
  });
});

async function handleAction(action: string, trackId: string, node: HTMLElement): Promise<void> {
  clearError();

  try {
    switch (action) {
      case "health":
        state.health = await api.health();
        state.statusMessage = "Health check complete.";
        break;
      case "reset":
        resetWorkspace();
        break;
      case "choose-track-files":
        clickFilePicker("tracks");
        return;
      case "choose-transcript-files":
        clickFilePicker("transcripts");
        return;
      case "probe":
        await probeTrack();
        break;
      case "select-all":
        state.tracks = state.tracks.map((track) => ({ ...track, selected: true }));
        state.selectedTrackId = state.tracks.at(0)?.id;
        updateDuration();
        syncAudioRouting();
        break;
      case "clear-solo":
        state.tracks = state.tracks.map((track) => ({ ...track, solo: false }));
        syncAudioRouting();
        break;
      case "activate-track":
        state.selectedTrackId = trackId;
        break;
      case "toggle-mute":
        toggleTrack(trackId, "muted");
        syncAudioRouting();
        break;
      case "toggle-solo":
        toggleTrack(trackId, "solo");
        syncAudioRouting();
        break;
      case "play":
      case "resume":
        await playSelected();
        break;
      case "pause":
        pauseSelected();
        break;
      case "rewind":
        await seekTo(state.currentMs - SEEK_STEP_MS);
        break;
      case "forward":
        await seekTo(state.currentMs + SEEK_STEP_MS);
        break;
      case "load-transcript":
        await loadTranscript();
        break;
      case "seek-paragraph":
        await seekTo(Number(node.dataset["startMs"] ?? "0"));
        break;
      case "plan-processing":
        await requestProcessingPlan();
        break;
      case "run-processing":
        await runProcessingJob();
        break;
      case "export-html":
        await exportHtmlTranscript();
        break;
      case "toggle-transcription-consent":
        state.transcriptionConfirmExternalUpload = !state.transcriptionConfirmExternalUpload;
        break;
      case "toggle-transcription-diarize":
        state.transcriptionDiarize = !state.transcriptionDiarize;
        state.transcriptionPlan = undefined;
        break;
      case "toggle-transcription-capability-gap":
        state.transcriptionFailOnCapabilityGap = !state.transcriptionFailOnCapabilityGap;
        state.transcriptionPlan = undefined;
        break;
      case "plan-transcription":
        await requestTranscriptionPlan();
        break;
      case "start-transcription":
        await startTranscription();
        break;
      case "refresh-transcription-jobs":
        await refreshTranscriptionJobs();
        break;
      case "load-generated-transcript":
        await loadTranscriptPaths([node.dataset["transcriptPath"] ?? ""]);
        break;
      default:
        return;
    }
  } catch (error) {
    state.errorMessage = errorToMessage(error);
    state.statusMessage = "Action failed.";
  }

  render();
}

function setField(field: string, value: string): void {
  if (field === "trackPathDraft") {
    state.trackPathDraft = value;
  } else if (field === "transcriptPath") {
    state.transcriptPath = value;
  } else if (field === "transcriptSearch") {
    state.transcriptSearch = value;
  } else if (field === "transcriptSpeakerFilter") {
    state.transcriptSpeakerFilter = value;
  } else if (field === "processingKind" && isProcessingKind(value)) {
    state.processingKind = value;
  } else if (field === "processingOutputPath") {
    state.processingOutputPath = value;
  } else if (field === "exportOutputPath") {
    state.exportOutputPath = value;
  } else if (field === "transcriptionProviderId" && isTranscriptionProviderId(value)) {
    state.transcriptionProviderId = value;
    state.transcriptionConfirmExternalUpload = false;
    state.transcriptionPlan = undefined;
  } else if (field === "transcriptionScope" && isTranscriptionScope(value)) {
    state.transcriptionScope = value;
  } else if (field === "transcriptionLanguageDraft") {
    state.transcriptionLanguageDraft = value;
  } else if (field === "transcriptionModelDraft") {
    state.transcriptionModelDraft = value;
  }
  render();
}

async function probeTrack(): Promise<void> {
  const path = state.trackPathDraft.trim();
  if (path.length === 0) {
    throw new Error("Enter an audio path before probing.");
  }

  await addTrackFromPath(path);
  state.trackPathDraft = "";
}

async function addTrackFromPath(path: string): Promise<AudioTrack> {
  state.statusMessage = `Probing ${path}`;
  render();
  const result = await api.probe(path);
  if (result.error || result.track === undefined) {
    throw new Error(result.error || "Probe did not return track metadata.");
  }

  const track = {
    ...result.track,
    selected: result.track.selected ?? true,
    muted: result.track.muted ?? false,
    solo: result.track.solo ?? false,
    status: "ready" as TrackStatus
  };

  state.tracks = state.tracks.filter((existing) => existing.id !== track.id).concat(track);
  state.selectedTrackId = state.selectedTrackId ?? track.id;
  state.statusMessage = `Probed ${track.displayName}.`;
  ensureRuntime(track);
  updateDuration();
  syncAudioRouting();
  render();
  return track;
}

async function handleTrackFiles(fileList?: FileList | null): Promise<void> {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    throw new Error("Choose or drop one or more M4A files.");
  }

  const { accepted, rejected } = classifyDroppedM4aFiles(files);
  if (accepted.length === 0) {
    throw new Error(`Selected files were rejected. Expected .m4a files: ${rejected.map((file) => file.name).join(", ")}`);
  }

  state.errorMessage = rejected.length
    ? `Rejected unsupported file(s): ${rejected.map((file) => file.name).join(", ")}`
    : "";
  state.statusMessage = `Loading ${accepted.length} dropped M4A file(s).`;
  render();

  const loaded: string[] = [];
  const failed: string[] = [];
  for (const file of accepted) {
    try {
      const staged = await api.uploadDroppedM4a(file);
      const track = await addTrackFromPath(staged.path);
      loaded.push(track.displayName || track.fileName);
    } catch (error) {
      failed.push(`${file.name}: ${errorToMessage(error)}`);
    }
  }

  const notices: string[] = [];
  if (rejected.length > 0) {
    notices.push(`Rejected unsupported file(s): ${rejected.map((file) => file.name).join(", ")}`);
  }
  if (failed.length > 0) {
    notices.push(`Failed dropped file(s): ${failed.join("; ")}`);
  }
  state.errorMessage = notices.join(" ");

  if (loaded.length === 0) {
    throw new Error(state.errorMessage || "No dropped M4A files were loaded.");
  }

  state.statusMessage = `Loaded dropped track(s): ${loaded.join(", ")}.`;
  updateDuration();
  syncAudioRouting();
  render();
}

async function handleTranscriptFiles(fileList?: FileList | null): Promise<void> {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    throw new Error("Choose or drop one or more JSONL transcript files.");
  }

  const { accepted, rejected } = classifyDroppedJsonlFiles(files);
  if (accepted.length === 0) {
    throw new Error(`Selected files were rejected. Expected .jsonl files: ${rejected.map((file) => file.name).join(", ")}`);
  }

  state.errorMessage = rejected.length
    ? `Rejected unsupported file(s): ${rejected.map((file) => file.name).join(", ")}`
    : "";
  state.statusMessage = `Loading ${accepted.length} selected JSONL transcript file(s).`;
  render();

  const stagedPaths: string[] = [];
  const failed: string[] = [];
  for (const file of accepted) {
    try {
      const staged = await api.uploadDroppedTranscript(file);
      stagedPaths.push(staged.path);
    } catch (error) {
      failed.push(`${file.name}: ${errorToMessage(error)}`);
    }
  }

  const notices: string[] = [];
  if (rejected.length > 0) {
    notices.push(`Rejected unsupported file(s): ${rejected.map((file) => file.name).join(", ")}`);
  }
  if (failed.length > 0) {
    notices.push(`Failed transcript file(s): ${failed.join("; ")}`);
  }
  state.errorMessage = notices.join(" ");

  if (stagedPaths.length === 0) {
    throw new Error(state.errorMessage || "No selected JSONL transcript files were loaded.");
  }

  await loadTranscriptPaths(stagedPaths);
}

async function loadTranscript(): Promise<void> {
  const path = state.transcriptPath.trim();
  if (path.length === 0) {
    throw new Error("Enter a transcript JSONL path before loading.");
  }

  await loadTranscriptPaths([path]);
}

async function loadTranscriptPaths(paths: string[]): Promise<void> {
  state.statusMessage = `Loading transcript ${paths.join(", ")}`;
  render();
  state.transcriptBundle = await api.loadTranscript(paths);
  state.statusMessage = `Loaded ${state.transcriptBundle.paragraphs.length} transcript paragraphs.`;
  render();
}

async function requestProcessingPlan(): Promise<void> {
  state.processingPlan = await api.planProcessing(processingPayload());
  state.statusMessage = "Processing plan generated. No destructive processing was run.";
}

async function runProcessingJob(): Promise<void> {
  const payload = processingPayload();
  state.statusMessage = "Running FFmpeg job.";
  render();
  state.processingRunResult = await api.runProcessing(payload);
  state.processingPlan = state.processingRunResult.plan;
  state.statusMessage = `Processing complete: ${state.processingRunResult.outputPath}`;
}

function processingPayload(): ProcessingPlanRequest {
  const selected = getSelectedTracks();
  if (selected.length === 0) {
    throw new Error("Select at least one track before requesting processing.");
  }
  const outputPath = state.processingOutputPath.trim();
  if (outputPath.length === 0) {
    throw new Error("Enter an output path for processing.");
  }

  const payload: ProcessingPlanRequest = {
    kind: state.processingKind,
    inputPaths: selected.map((track) => track.path),
    outputPath
  };
  if (state.processingKind === "denoise") {
    payload.denoisePreset = "conservative";
  }
  if (state.processingKind === "loudness") {
    payload.loudnessTarget = "I=-16:TP=-1.5:LRA=11";
  }
  return payload;
}

async function exportHtmlTranscript(): Promise<void> {
  const transcriptBundle = state.transcriptBundle;
  if (transcriptBundle === undefined) {
    throw new Error("Load a transcript before exporting HTML.");
  }
  const outputPath = state.exportOutputPath.trim();
  if (outputPath.length === 0) {
    throw new Error("Enter an HTML output path.");
  }

  state.exportResult = await api.exportTranscriptHtml({ outputPath, transcriptBundle });
  state.statusMessage = "HTML transcript export requested.";
}

async function requestTranscriptionPlan(): Promise<void> {
  state.transcriptionPlan = await api.planTranscription(transcriptionPayload());
  state.statusMessage = "Transcription plan generated.";
}

async function startTranscription(): Promise<void> {
  const payload = transcriptionPayload();
  state.statusMessage = "Starting transcription job(s).";
  render();
  const response = await api.startTranscriptionJobs(payload);
  state.transcriptionJobs = response.jobs;
  state.statusMessage = `Started ${response.jobs.length} transcription job(s).`;
  window.setTimeout(() => {
    void refreshTranscriptionJobs().catch((error) => {
      state.errorMessage = errorToMessage(error);
      render();
    });
  }, 1_000);
}

async function refreshTranscriptionJobs(): Promise<void> {
  state.transcriptionJobs = (await api.listTranscriptionJobs()).jobs;
  const active = state.transcriptionJobs.some((job) => job.state !== "succeeded" && job.state !== "failed");
  state.statusMessage = "Transcription job status refreshed.";
  render();
  if (active) {
    window.setTimeout(() => {
      void refreshTranscriptionJobs().catch((error) => {
        state.errorMessage = errorToMessage(error);
        render();
      });
    }, 2_000);
  }
}

function transcriptionPayload(): {
  inputPaths: string[];
  providerId?: TranscriptionProviderId;
  languageHints?: string[];
  model?: string;
  diarize: boolean;
  confirmExternalUpload: boolean;
  failOnCapabilityGap: boolean;
} {
  const inputPaths = transcriptionInputPaths();
  const providerId = state.transcriptionProviderId;
  const languageHints = state.transcriptionLanguageDraft
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const model = state.transcriptionModelDraft.trim();
  return {
    inputPaths,
    ...(providerId === "" ? {} : { providerId }),
    ...(languageHints.length === 0 ? {} : { languageHints }),
    ...(model.length === 0 ? {} : { model }),
    diarize: state.transcriptionDiarize,
    confirmExternalUpload: state.transcriptionConfirmExternalUpload,
    failOnCapabilityGap: state.transcriptionFailOnCapabilityGap
  };
}

function transcriptionInputPaths(): string[] {
  if (state.transcriptionScope === "active") {
    const active = state.tracks.find((track) => track.id === state.selectedTrackId) ?? getSelectedTracks()[0];
    if (active === undefined) {
      throw new Error("Select an active track before transcribing.");
    }
    return [active.path];
  }
  if (state.transcriptionScope === "selected") {
    const selected = getSelectedTracks();
    if (selected.length === 0) {
      throw new Error("Select at least one track before transcribing.");
    }
    return selected.map((track) => track.path);
  }
  if (state.tracks.length === 0) {
    throw new Error("Load a session with at least one track before transcribing.");
  }
  return state.tracks.map((track) => track.path);
}

async function playSelected(): Promise<void> {
  const selected = getSelectedTracks();
  if (selected.length === 0) {
    throw new Error("Select at least one track before playback.");
  }

  await ensureAudioContext();
  syncAudioRouting();

  const targetMs = state.currentMs;
  await Promise.all(selected.map((track) => prepareTrackForTime(track, targetMs)));
  await Promise.all(
    selected.map(async (track) => {
      const runtime = ensureRuntime(track);
      await runtime.audio.play();
    })
  );

  state.transportStatus = "playing";
  markSelectedStatus("playing");
  startTicker();
}

function pauseSelected(): void {
  for (const track of getSelectedTracks()) {
    const runtime = runtimes.get(track.id);
    runtime?.audio.pause();
  }
  state.transportStatus = "paused";
  markSelectedStatus("paused");
  stopTicker();
}

async function seekTo(ms: number): Promise<void> {
  const maxDuration = getMaxDurationMs();
  state.currentMs = clamp(ms, 0, maxDuration || Number.MAX_SAFE_INTEGER);
  await Promise.all(getSelectedTracks().map((track) => prepareTrackForTime(track, state.currentMs)));
  updateDrift();
  render();
}

async function prepareTrackForTime(track: AudioTrack, targetMs: number): Promise<void> {
  const runtime = ensureRuntime(track);
  const mediaTime = Math.max(0, msToSeconds(targetMs + track.offsetMs));
  if (Number.isFinite(runtime.audio.duration)) {
    runtime.audio.currentTime = Math.min(mediaTime, runtime.audio.duration);
  } else {
    runtime.audio.currentTime = mediaTime;
  }
  if (runtime.audio.readyState < HTMLMediaElement.HAVE_METADATA) {
    await waitForMetadata(runtime.audio);
  }
}

function ensureRuntime(track: AudioTrack): TrackRuntime {
  const existing = runtimes.get(track.id);
  if (existing) {
    return existing;
  }

  const audio = new Audio();
  audio.preload = "metadata";
  audio.crossOrigin = "anonymous";
  audio.src = mediaUrl(track.path);
  audio.addEventListener("error", () => {
    updateTrack(track.id, {
      status: "error",
      error: "Browser could not load this audio path as a media URL."
    });
    state.transportStatus = "error";
    state.errorMessage = "Audio element load failed. Backend may need to expose a media URL for local file paths.";
    stopTicker();
    render();
  });
  audio.addEventListener("ended", () => {
    updateTrack(track.id, { status: "paused" });
    if (getSelectedTracks().every((selected) => runtimes.get(selected.id)?.audio.paused !== false)) {
      state.transportStatus = "paused";
      stopTicker();
      render();
    }
  });

  const runtime: TrackRuntime = { audio };
  runtimes.set(track.id, runtime);
  connectRuntime(track.id, runtime);
  return runtime;
}

async function ensureAudioContext(): Promise<void> {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioContextCtor === undefined) {
    return;
  }

  audioContext = audioContext ?? new AudioContextCtor();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  for (const [trackId, runtime] of runtimes) {
    connectRuntime(trackId, runtime);
  }
}

function connectRuntime(trackId: string, runtime: TrackRuntime): void {
  if (audioContext === undefined || runtime.source !== undefined) {
    return;
  }

  try {
    runtime.source = audioContext.createMediaElementSource(runtime.audio);
    runtime.gain = audioContext.createGain();
    runtime.source.connect(runtime.gain);
    runtime.gain.connect(audioContext.destination);
    const track = state.tracks.find((candidate) => candidate.id === trackId);
    if (track) {
      applyTrackVolume(track, runtime);
    }
  } catch {
    runtime.audio.muted = false;
  }
}

function syncAudioRouting(): void {
  const soloActive = state.tracks.some((track) => track.solo);
  for (const track of state.tracks) {
    const runtime = ensureRuntime(track);
    applyTrackVolume(track, runtime, soloActive);
  }
}

function applyTrackVolume(track: AudioTrack, runtime: TrackRuntime, soloActive?: boolean): void {
  const shouldSilence = track.muted || (soloActive ?? state.tracks.some((candidate) => candidate.solo)) && !track.solo;
  if (runtime.gain) {
    runtime.gain.gain.value = shouldSilence ? 0 : 1;
    runtime.audio.muted = false;
  } else {
    runtime.audio.muted = shouldSilence;
  }
}

function startTicker(): void {
  stopTicker();
  const tick = (): void => {
    updatePlayheadFromRuntime();
    updateDrift();
    updateLivePlaybackDom();
    if (state.transportStatus === "playing") {
      rafId = window.requestAnimationFrame(tick);
    }
  };
  rafId = window.requestAnimationFrame(tick);
}

function stopTicker(): void {
  if (rafId !== 0) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function updatePlayheadFromRuntime(): void {
  const master = getMasterTrack();
  if (master === undefined) {
    return;
  }
  const runtime = runtimes.get(master.id);
  if (runtime === undefined) {
    return;
  }
  state.currentMs = Math.max(0, secondsToMs(runtime.audio.currentTime) - master.offsetMs);
}

function updateDrift(): void {
  const master = getMasterTrack();
  const masterRuntime = master ? runtimes.get(master.id) : undefined;
  if (master === undefined || masterRuntime === undefined) {
    state.driftByTrackId = {};
    return;
  }

  const masterMs = secondsToMs(masterRuntime.audio.currentTime) - master.offsetMs;
  const driftByTrackId: Record<string, number> = {};
  for (const track of getSelectedTracks()) {
    const runtime = runtimes.get(track.id);
    if (runtime === undefined) {
      continue;
    }
    const trackMs = secondsToMs(runtime.audio.currentTime) - track.offsetMs;
    driftByTrackId[track.id] = Math.round(trackMs - masterMs);
  }
  state.driftByTrackId = driftByTrackId;
}

function updateLivePlaybackDom(): void {
  const timecode = document.querySelector<HTMLElement>("[data-live-timecode]");
  if (timecode) {
    timecode.textContent = formatTimestamp(state.currentMs, { milliseconds: true });
  }

  const maxDuration = state.durationMs > 0 ? state.durationMs : getMaxDurationMs();
  const seek = document.querySelector<HTMLInputElement>("[data-live-seek]");
  if (seek) {
    seek.max = String(Math.max(maxDuration, 1));
    seek.value = String(Math.min(state.currentMs, maxDuration || state.currentMs));
  }

  const progress = document.querySelector<HTMLElement>("[data-live-progress]");
  if (progress) {
    const width = maxDuration > 0 ? Math.min(100, (state.currentMs / maxDuration) * 100) : 0;
    progress.style.width = `${width}%`;
  }

  for (const track of getSelectedTracks()) {
    const drift = state.driftByTrackId[track.id] ?? 0;
    const driftNode = document.querySelector<HTMLElement>(`[data-live-drift="${cssEscape(track.id)}"]`);
    if (driftNode) {
      driftNode.textContent = formatSignedMs(drift);
      driftNode.className = Math.abs(drift) <= SYNC_TOLERANCE_MS ? "ok" : "warn";
    }
    const statusNode = document.querySelector<HTMLElement>(`[data-live-status="${cssEscape(track.id)}"]`);
    if (statusNode) {
      statusNode.textContent = track.status;
    }
  }

  for (const row of document.querySelectorAll<HTMLElement>(".paragraph-row")) {
    const startMs = Number(row.dataset["startMs"] ?? "0");
    const endMs = Number(row.dataset["endMs"] ?? "0");
    row.classList.toggle("active", startMs <= state.currentMs && state.currentMs <= endMs);
  }
}

function waitForMetadata(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const cleanup = (): void => {
      audio.removeEventListener("loadedmetadata", cleanup);
      audio.removeEventListener("error", cleanup);
      resolve();
    };
    audio.addEventListener("loadedmetadata", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });
  });
}

function getVisibleParagraphs(): TranscriptParagraph[] {
  const paragraphs = state.transcriptBundle?.paragraphs ?? [];
  const query = state.transcriptSearch.trim().toLowerCase();
  return paragraphs.filter((paragraph) => {
    const speakerMatches =
      state.transcriptSpeakerFilter.length === 0 || paragraph.speaker === state.transcriptSpeakerFilter;
    if (!speakerMatches) {
      return false;
    }
    if (query.length === 0) {
      return true;
    }
    return [paragraph.text, paragraph.speaker, paragraph.source, paragraph.language]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLowerCase().includes(query));
  });
}

function getSpeakers(bundle?: TranscriptBundle): string[] {
  const speakers = new Set<string>();
  for (const paragraph of bundle?.paragraphs ?? []) {
    if (paragraph.speaker) {
      speakers.add(paragraph.speaker);
    }
  }
  return Array.from(speakers).sort((a, b) => a.localeCompare(b));
}

function getSelectedTracks(): AudioTrack[] {
  return state.tracks.filter((track) => track.selected);
}

function getSelectedTranscriptionProvider(): TranscriptionProviderInfo | undefined {
  return state.transcriptionProviders.find((provider) => provider.id === state.transcriptionProviderId);
}

function getMasterTrack(): AudioTrack | undefined {
  const selected = getSelectedTracks();
  return selected.find((track) => track.id === state.selectedTrackId) ?? selected[0];
}

function updateDuration(): void {
  state.durationMs = getMaxDurationMs();
}

function getMaxDurationMs(): number {
  return Math.max(0, ...getSelectedTracks().map((track) => secondsToMs(track.durationSec)));
}

function updateTrack(trackId: string, patch: Partial<AudioTrack>): void {
  state.tracks = state.tracks.map((track) => (track.id === trackId ? { ...track, ...patch } : track));
}

function toggleTrack(trackId: string, field: "muted" | "solo"): void {
  const track = state.tracks.find((candidate) => candidate.id === trackId);
  if (track === undefined) {
    return;
  }
  updateTrack(trackId, { [field]: !track[field] });
}

function applyLayoutSizing(): void {
  appRoot.style.setProperty("--sidebar-width", `${state.sidebarWidthPx}px`);
  appRoot.style.setProperty("--processing-width", `${state.processingWidthPx}px`);
}

function resizeTargetFromNode(node: HTMLElement): ResizeTarget | undefined {
  const target = node.dataset["resizeTarget"];
  return target === "sidebar" || target === "processing" ? target : undefined;
}

function currentPanelWidth(target: ResizeTarget): number {
  return target === "sidebar" ? state.sidebarWidthPx : state.processingWidthPx;
}

function setPanelWidth(target: ResizeTarget, width: number): void {
  if (target === "sidebar") {
    state.sidebarWidthPx = clampPanelWidth(width, SIDEBAR_RESIZE);
  } else {
    state.processingWidthPx = clampPanelWidth(width, PROCESSING_RESIZE);
  }
  applyLayoutSizing();
  updateResizeHandleValue(target, currentPanelWidth(target));
}

function updatePanelWidthFromPointer(session: ResizeSession, clientX: number): void {
  const bounds = session.target === "sidebar" ? SIDEBAR_RESIZE : PROCESSING_RESIZE;
  setPanelWidth(
    session.target,
    resizeWidthFromPointer({
      target: session.target,
      startClientX: session.startClientX,
      startWidth: session.startWidth,
      currentClientX: clientX,
      bounds
    })
  );
}

function updateResizeHandleValue(target: ResizeTarget, width: number): void {
  const handle = appRoot.querySelector<HTMLElement>(`[data-resize-target="${target}"]`);
  handle?.setAttribute("aria-valuenow", String(width));
}

type DropTargetKind = "tracks" | "transcripts";

function clickFilePicker(kind: DropTargetKind): void {
  const picker = document.querySelector<HTMLInputElement>(`input[data-file-picker="${kind}"]`);
  if (picker === null) {
    throw new Error(`Missing ${kind} file picker.`);
  }
  picker.click();
}

function dropTargetFromEvent(event: DragEvent): HTMLElement | null {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return target.closest<HTMLElement>("[data-drop-target]");
}

function dropTargetKind(dropTarget: HTMLElement): DropTargetKind | undefined {
  const kind = dropTarget.dataset["dropTarget"];
  return kind === "tracks" || kind === "transcripts" ? kind : undefined;
}

function isDropActive(kind: DropTargetKind): boolean {
  return kind === "tracks" ? state.trackDropActive : state.transcriptDropActive;
}

function setDropActive(kind: DropTargetKind, active: boolean): void {
  if (kind === "tracks") {
    state.trackDropActive = active;
  } else {
    state.transcriptDropActive = active;
  }
}

function markSelectedStatus(status: TrackStatus): void {
  const selectedIds = new Set(getSelectedTracks().map((track) => track.id));
  state.tracks = state.tracks.map((track) =>
    selectedIds.has(track.id) ? { ...track, status } : track
  );
}

function buildSessionManifest(): SessionManifest {
  const now = new Date().toISOString();
  const manifest: SessionManifest = {
    version: SESSION_MANIFEST_VERSION,
    createdAtIso: now,
    updatedAtIso: now,
    tracks: state.tracks,
    derivedOutputs: []
  };
  if (state.transcriptBundle !== undefined) {
    manifest.transcriptBundle = state.transcriptBundle;
  }
  return manifest;
}

function resetWorkspace(): void {
  stopTicker();
  for (const runtime of runtimes.values()) {
    runtime.audio.pause();
    runtime.audio.removeAttribute("src");
    runtime.audio.load();
  }
  runtimes.clear();
  state.tracks = [];
  state.transcriptBundle = undefined;
  state.currentMs = 0;
  state.durationMs = 0;
  state.driftByTrackId = {};
  state.selectedTrackId = undefined;
  state.trackDropActive = false;
  state.transcriptDropActive = false;
  state.transportStatus = "idle";
  state.processingPlan = undefined;
  state.processingRunResult = undefined;
  state.exportResult = undefined;
  state.transcriptionPlan = undefined;
  state.transcriptionJobs = [];
  state.statusMessage = "Workspace reset.";
  state.errorMessage = "";
}

function clearError(): void {
  state.errorMessage = "";
}

function isProcessingKind(value: string): value is ProcessingKind {
  return value === "mix" || value === "source-separated" || value === "denoise" || value === "loudness";
}

function isTranscriptionProviderId(value: string): value is TranscriptionProviderId {
  return value === "soniox" || value === "apple-local" || value === "elevenlabs";
}

function isTranscriptionScope(value: string): value is AppState["transcriptionScope"] {
  return value === "active" || value === "selected" || value === "session";
}

function statusTone(status: TrackStatus): string {
  if (status === "error") {
    return "danger";
  }
  if (status === "playing" || status === "ready") {
    return "ok";
  }
  return "pending";
}

function prereqLine(name: string, ok: boolean, versionLine?: string, error?: string): string {
  const tone = ok ? "ok" : "danger";
  const detail = versionLine || error || "No detail";
  return `<div><span class="status-dot ${tone}"></span><strong>${escapeHtml(name)}</strong> ${escapeHtml(detail)}</div>`;
}

function stringifyResult(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function formatSignedMs(ms: number): string {
  return `${ms >= 0 ? "+" : ""}${Math.round(ms)} ms`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function highlightText(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return escaped;
  }
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index < 0) {
    return escaped;
  }
  const before = escapeHtml(text.slice(0, index));
  const match = escapeHtml(text.slice(index, index + trimmed.length));
  const after = escapeHtml(text.slice(index + trimmed.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function cssEscape(value: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replaceAll('"', '\\"');
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mediaUrl(path: string): string {
  return `/api/media?path=${encodeURIComponent(path)}`;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
