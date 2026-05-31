export function secondsToMs(seconds: number): number {
  return Math.round(seconds * 1000);
}

export function msToSeconds(ms: number): number {
  return ms / 1000;
}

export function formatTimestamp(ms: number, options: { milliseconds?: boolean } = {}): string {
  const safeMs = Math.max(0, Math.round(ms));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const millis = safeMs % 1000;
  const base =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  return options.milliseconds ? `${base}.${String(millis).padStart(3, "0")}` : base;
}

export function parseTimestampToMs(value: string): number {
  const trimmed = value.trim();
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Expected timestamp as MM:SS, MM:SS.mmm, HH:MM:SS, or HH:MM:SS.mmm: ${value}`);
  }

  const hoursRaw = parts.length === 3 ? parts[0] : "0";
  const minutesRaw = parts.length === 3 ? parts[1] : parts[0];
  const secondsRaw = parts.length === 3 ? parts[2] : parts[1];
  if (hoursRaw === undefined || minutesRaw === undefined || secondsRaw === undefined) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  const hours = parseIntegerPart(hoursRaw, "hours");
  const minutes = parseIntegerPart(minutesRaw, "minutes");
  const seconds = Number(secondsRaw);

  if (!Number.isFinite(seconds) || seconds < 0 || minutes < 0 || minutes >= 60 || hours < 0) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

export function isoDeltaMs(timestampIso: string, anchorIso: string): number {
  const timestamp = Date.parse(timestampIso);
  const anchor = Date.parse(anchorIso);
  if (!Number.isFinite(timestamp) || !Number.isFinite(anchor)) {
    throw new Error(`Cannot map invalid ISO timestamp '${timestampIso}' against anchor '${anchorIso}'`);
  }
  return Math.max(0, timestamp - anchor);
}

function parseIntegerPart(value: string, label: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label} field in timestamp: ${value}`);
  }
  return Number(value);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
