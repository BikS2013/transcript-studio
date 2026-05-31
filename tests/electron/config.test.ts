import { describe, expect, it } from "vitest";

import { electronPortFromArgs, localWorkspaceUrl } from "../../src/electron/config.js";

describe("Electron workspace configuration", () => {
  it("uses the standard local backend port by default", () => {
    expect(electronPortFromArgs([])).toBe(4317);
    expect(localWorkspaceUrl(4317)).toBe("http://127.0.0.1:4317");
  });

  it("accepts explicit port arguments", () => {
    expect(electronPortFromArgs(["--port", "5123"])).toBe(5123);
    expect(electronPortFromArgs(["--port=5124"])).toBe(5124);
  });

  it("rejects invalid explicit port arguments", () => {
    expect(() => electronPortFromArgs(["--port", "70000"])).toThrow("Invalid --port value: 70000");
  });
});
