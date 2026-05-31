import { describe, expect, it } from "vitest";

import {
  clampPanelWidth,
  PROCESSING_RESIZE,
  resizeWidthFromPointer,
  SIDEBAR_RESIZE
} from "../../src/frontend/layout/resize.js";

describe("resizable panel sizing", () => {
  it("clamps panel widths to configured bounds", () => {
    expect(clampPanelWidth(100, SIDEBAR_RESIZE)).toBe(SIDEBAR_RESIZE.min);
    expect(clampPanelWidth(10_000, PROCESSING_RESIZE)).toBe(PROCESSING_RESIZE.max);
    expect(clampPanelWidth(421.6, SIDEBAR_RESIZE)).toBe(422);
  });

  it("increases sidebar width when the left handle moves right", () => {
    expect(
      resizeWidthFromPointer({
        target: "sidebar",
        startWidth: 340,
        startClientX: 300,
        currentClientX: 380,
        bounds: SIDEBAR_RESIZE
      })
    ).toBe(420);
  });

  it("increases processing width when the right handle moves left", () => {
    expect(
      resizeWidthFromPointer({
        target: "processing",
        startWidth: 360,
        startClientX: 900,
        currentClientX: 820,
        bounds: PROCESSING_RESIZE
      })
    ).toBe(440);
  });
});
