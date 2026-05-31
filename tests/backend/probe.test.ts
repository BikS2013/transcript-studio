import { describe, expect, it } from "vitest";

import { audioTrackFromProbe } from "../../src/backend/ffmpeg/probe.js";

describe("ffprobe metadata mapping", () => {
  it("creates distinct stable IDs for files that share a long path prefix", () => {
    const metadata = {
      streams: [
        {
          codec_type: "audio",
          codec_name: "aac",
          sample_rate: "48000",
          channels: 2,
          duration: "10"
        }
      ],
      format: {
        duration: "10",
        tags: {}
      }
    };

    const mic = audioTrackFromProbe(
      "/Users/giorgosmarinos/Documents/sync-transcript-studio/.transcript-studio/dropped-media/recording-2026-05-14-15-59.mic-e6a6f4b89fbe30df.m4a",
      metadata
    );
    const system = audioTrackFromProbe(
      "/Users/giorgosmarinos/Documents/sync-transcript-studio/.transcript-studio/dropped-media/recording-2026-05-14-15-59.system-6de6188909474731.m4a",
      metadata
    );

    expect(mic.id).toMatch(/^track-/);
    expect(system.id).toMatch(/^track-/);
    expect(mic.id).not.toBe(system.id);
  });
});
