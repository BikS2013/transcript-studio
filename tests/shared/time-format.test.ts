import { describe, expect, it } from "vitest";

import { formatTimestamp, parseTimestampToMs } from "../../src/shared/time/format.js";

describe("shared time formatting", () => {
  it("formats elapsed milliseconds with and without subsecond precision", () => {
    expect(formatTimestamp(61_234)).toBe("01:01");
    expect(formatTimestamp(3_661_250, { milliseconds: true })).toBe("01:01:01.250");
  });

  it("parses transcript-style timestamps and rejects malformed values", () => {
    expect(parseTimestampToMs("01:02.250")).toBe(62_250);
    expect(parseTimestampToMs("01:02:03.500")).toBe(3_723_500);
    expect(() => parseTimestampToMs("invalid")).toThrow(
      "Expected timestamp as MM:SS, MM:SS.mmm, HH:MM:SS, or HH:MM:SS.mmm: invalid"
    );
    expect(() => parseTimestampToMs("61:00")).toThrow("Invalid timestamp: 61:00");
  });
});
