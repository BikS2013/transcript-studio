import { describe, expect, it } from "vitest";

import { classifyDroppedM4aFiles, isM4aFileName } from "../../src/frontend/drop/m4a.js";

describe("dropped M4A classification", () => {
  it("accepts M4A filenames case-insensitively", () => {
    expect(isM4aFileName("session.m4a")).toBe(true);
    expect(isM4aFileName("SESSION.M4A")).toBe(true);
  });

  it("separates supported and unsupported dropped files", () => {
    const result = classifyDroppedM4aFiles([
      { name: "mic.m4a" },
      { name: "notes.txt" },
      { name: "system.M4A" },
      { name: "transcript.jsonl" }
    ]);

    expect(result.accepted.map((file) => file.name)).toEqual(["mic.m4a", "system.M4A"]);
    expect(result.rejected.map((file) => file.name)).toEqual(["notes.txt", "transcript.jsonl"]);
  });
});
