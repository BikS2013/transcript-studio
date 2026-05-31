import { describe, expect, it } from "vitest";

import { parseCliArgs, renderHelp } from "../../src/cli/args.js";

describe("Transcript Studio CLI arguments", () => {
  it("defaults to starting the workspace on the standard port", () => {
    expect(parseCliArgs([])).toEqual({ action: "start", port: 4317 });
  });

  it("parses explicit start and port arguments", () => {
    expect(parseCliArgs(["start", "--port", "5123"])).toEqual({ action: "start", port: 5123 });
    expect(parseCliArgs(["--port=5124"])).toEqual({ action: "start", port: 5124 });
  });

  it("parses the UI command with optional port arguments", () => {
    expect(parseCliArgs(["ui"])).toEqual({ action: "ui", port: 4317 });
    expect(parseCliArgs(["ui", "--port", "5123"])).toEqual({ action: "ui", port: 5123 });
  });

  it("parses help and version actions", () => {
    expect(parseCliArgs(["--help"])).toEqual({ action: "help", port: 4317 });
    expect(parseCliArgs(["--", "--help"])).toEqual({ action: "help", port: 4317 });
    expect(parseCliArgs(["--version"])).toEqual({ action: "version", port: 4317 });
  });

  it("parses transcription command inputs and provider options", () => {
    expect(
      parseCliArgs([
        "transcribe",
        "--input",
        "/tmp/a.m4a",
        "--input=/tmp/b.m4a",
        "--provider",
        "soniox",
        "--language",
        "en",
        "--model=stt-async-v3",
        "--diarize",
        "--confirm-external-upload",
        "--fail-on-capability-gap"
      ])
    ).toEqual({
      action: "transcribe",
      port: 4317,
      transcribe: {
        inputPaths: ["/tmp/a.m4a", "/tmp/b.m4a"],
        providerId: "soniox",
        languageHints: ["en"],
        model: "stt-async-v3",
        diarize: true,
        confirmExternalUpload: true,
        failOnCapabilityGap: true
      }
    });
  });

  it("parses transcription session inputs", () => {
    expect(parseCliArgs(["transcribe", "--session", "/tmp/session.json", "--provider=apple-local"])).toEqual({
      action: "transcribe",
      port: 4317,
      transcribe: {
        inputPaths: [],
        sessionPath: "/tmp/session.json",
        providerId: "apple-local",
        confirmExternalUpload: false,
        failOnCapabilityGap: false
      }
    });
  });

  it("rejects unknown flags and invalid ports explicitly", () => {
    expect(() => parseCliArgs(["--missing"])).toThrow("Unknown transcript-studio argument: --missing");
    expect(() => parseCliArgs(["--port", "0"])).toThrow("Invalid --port value: 0");
    expect(() => parseCliArgs(["start", "ui"])).toThrow("Multiple transcript-studio commands provided");
    expect(() => parseCliArgs(["transcribe", "--input", "/tmp/a.m4a", "--session", "/tmp/session.json"])).toThrow(
      "Use either --input or --session for transcription, not both"
    );
  });

  it("renders canonical command help", () => {
    expect(renderHelp()).toContain("Transcript Studio");
    expect(renderHelp()).toContain("transcript-studio [start] [--port <port>]");
    expect(renderHelp()).toContain("transcript-studio ui [--port <port>]");
    expect(renderHelp()).toContain("transcript-studio transcribe --input <path.m4a>");
  });
});
