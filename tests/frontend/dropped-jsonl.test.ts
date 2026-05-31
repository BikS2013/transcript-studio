import { describe, expect, it } from "vitest";

import { classifyDroppedJsonlFiles, isJsonlFileName } from "../../src/frontend/drop/jsonl.js";

describe("dropped JSONL classification", () => {
  it("accepts JSONL filenames case-insensitively", () => {
    expect(isJsonlFileName("transcript.jsonl")).toBe(true);
    expect(isJsonlFileName("TRANSCRIPT.JSONL")).toBe(true);
  });

  it("separates supported and unsupported dropped files", () => {
    const result = classifyDroppedJsonlFiles([
      { name: "transcript.jsonl" },
      { name: "audio.m4a" },
      { name: "qa.JSONL" },
      { name: "notes.txt" }
    ]);

    expect(result.accepted.map((file) => file.name)).toEqual(["transcript.jsonl", "qa.JSONL"]);
    expect(result.rejected.map((file) => file.name)).toEqual(["audio.m4a", "notes.txt"]);
  });
});
