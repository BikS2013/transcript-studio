export type ResizeTarget = "sidebar" | "processing";

export interface ResizeBounds {
  min: number;
  max: number;
}

export const SIDEBAR_RESIZE: ResizeBounds = {
  min: 260,
  max: 560
};

export const PROCESSING_RESIZE: ResizeBounds = {
  min: 280,
  max: 620
};

export function clampPanelWidth(width: number, bounds: ResizeBounds): number {
  if (!Number.isFinite(width)) {
    return bounds.min;
  }
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, width)));
}

export function resizeWidthFromPointer(input: {
  target: ResizeTarget;
  startWidth: number;
  startClientX: number;
  currentClientX: number;
  bounds: ResizeBounds;
}): number {
  const delta = input.currentClientX - input.startClientX;
  const nextWidth = input.target === "sidebar" ? input.startWidth + delta : input.startWidth - delta;
  return clampPanelWidth(nextWidth, input.bounds);
}
