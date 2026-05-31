# Web Audio Synchronized Playback Notes

## Overview
This note focuses on browser-hosted TypeScript playback of multiple local audio files, with synchronized start, pause/resume, seeking, drift handling, selective muting, and timeline UI behavior. The main implementation choice is whether the app uses `HTMLMediaElement` as the playback transport, `AudioContext` and `AudioBufferSourceNode` as the playback transport, or a hybrid of both. The documentation below treats `AudioContext.currentTime` as the most useful sync anchor when the app needs deterministic multi-track scheduling, while `HTMLMediaElement.currentTime` remains the broad-compatibility seek surface for file-backed audio elements. citeturn2search0turn9search14turn13search0

## Assumptions & Scope
- Assumption: the eventual app runs in a browser or browser-like runtime and uses TypeScript.
- Assumption: the immediate problem is playback and navigation, not FFmpeg processing or transcript parsing.
- Assumption: the audio files are user-selected local files, not arbitrary filesystem paths.
- Confidence: high for the browser timing model; medium for the eventual transport choice because the final design depends on file duration, memory budget, and browser compatibility. citeturn5search0turn5search3turn6search0

## Key Concepts
### HTMLMediaElement timing
`HTMLMediaElement.currentTime` is the simplest way to seek a file-backed `<audio>` element; setting it seeks the media to the requested playback position. `seeked` fires when the seek completes, `seeking` reports that seeking is in progress, and `timeupdate` is intentionally coarse and load-dependent. `fastSeek()` exists for quick approximate seeks, but MDN marks it as limited availability and recommends `currentTime` when precision matters. The `readyState` and `loadedmetadata` states/events matter because the browser cannot reliably seek until metadata is available. citeturn9search14turn0search6turn0search4turn9search0turn0search10turn0search9turn0search17turn0search1

### Web Audio clocking
`AudioContext.currentTime` is the audio clock for scheduling. It is a hardware-driven timestamp that advances independently of the UI thread, and it is the clock you should use when you need to schedule aligned playback across multiple sources. `AudioContext.getOutputTimestamp()` exposes both `contextTime` and `performanceTime`, which is useful when you need to map the audio clock to the visual clock and reason about output latency. MDN also documents `baseLatency` and `outputLatency` as latency estimates that can help you account for the delay between scheduling and audible output. citeturn2search0turn3search0turn10search0turn14search0

### Buffer-source constraints
`AudioBufferSourceNode` is designed for in-memory audio and is especially useful when timing accuracy matters. It can only be started once, so pause/resume or seek operations require creating new source nodes after each restart. `AudioBuffer` is intended for short audio assets and MDN notes that these objects are typically best for snippets under about 45 seconds; for longer sounds, media-element-backed playback is usually more suitable. The `start(when, offset, duration)` signature is the key API for sample-accurate alignment, because both `when` and `offset` live in the `AudioContext` time coordinate system. citeturn6search1turn6search0turn13search0

### Media-element audio sources
`AudioContext.createMediaElementSource()` wraps an existing `<audio>` or `<video>` element as a `MediaElementAudioSourceNode`, which lets Web Audio handle routing, gain, and analysis while the media element still owns transport, buffering, and file playback. This is the most practical path when the files are long or when you need broader browser support and easier local file handling. citeturn8search0turn8search1turn8search19

## Implementation Notes
### 1) HTMLMediaElement vs Web Audio timing
For a browser app that needs multiple local recordings to stay aligned, `HTMLMediaElement` is the broad-compatibility transport, but it is not the precision scheduler. Its update and seek events are browser-driven and `timeupdate` is intentionally sparse, so it is good for transport state and UI binding but not ideal as the master sync clock. Web Audio gives you a more deterministic clock and explicit scheduling through `AudioContext.currentTime` and `AudioBufferSourceNode.start()`. In practice, a hybrid design is often the safest default: media elements for long-file playback and file loading, Web Audio for clocking, routing, metering, and sync-sensitive operations. citeturn9search0turn2search0turn13search0turn8search0turn8search19

### 2) AudioContext clock usage
Treat the `AudioContext` as the source of truth for aligned starts and for any UI that wants to track audible playback instead of merely buffered media state. `getOutputTimestamp()` is useful when you want to map the audio clock to `performance.now()` and estimate how far the audible output lags the internal schedule. `baseLatency` and `outputLatency` can be used as implementation hints when you choose how far ahead of audible playback to schedule the next group start or when you estimate whether a correction is still safe to apply without a hard resync. The browser may round `currentTime` for privacy, so avoid assuming sub-millisecond precision from the UI layer alone. citeturn3search0turn10search0turn14search0turn2search0

### 3) Seeking a group of tracks to one timestamp
The safest group-seek flow is:

1. Wait until each selected track has metadata and is seekable.
2. Pause or suspend the current transport.
3. Set every selected track to the target logical timestamp, adjusted for that track's start offset.
4. Wait for each track's `seeked` event before resuming playback.
5. Resume or start all selected tracks from one shared future `AudioContext.currentTime` anchor.

For media-element transport, the seek step is `element.currentTime = targetSeconds`. For buffer-source transport, the seek step is to recreate the source and call `start(anchorTime, offsetSeconds)`, because the node itself cannot be restarted. For approximate scrubbing, `fastSeek()` can be used, but the precise seek path should remain `currentTime` so the app does not trade away alignment accuracy. citeturn0search17turn0search6turn0search4turn13search0turn6search1turn0search10

### 4) Drift detection and correction
No browser API will keep multiple independent tracks locked together automatically, so the app has to detect and repair drift itself. A practical strategy is to compare the expected position against the master clock on a regular cadence, not just on `timeupdate`, because `timeupdate` can arrive only about 4 to 66 times per second depending on load. For Web Audio-backed playback, compare the scheduled position to `AudioContext.currentTime` and, when useful, convert that clock into a display timeline using `getOutputTimestamp()`. For media elements, compare each element's `currentTime` against the chosen master track or master clock. Small drift can be tolerated; larger drift should trigger a resync by stopping and recreating the affected source or by re-seeking the lagging element to the master time. citeturn9search0turn3search0turn9search14turn6search1

The correction policy should be explicit. Good options are:
- soft correction: keep the track playing and only update UI state until drift exceeds a threshold.
- hard correction: stop and restart the outlier track when drift becomes user-noticeable.
- master rebase: choose one track as the clock master and move the others to it.

That threshold is an application decision, not a browser guarantee. The browser only gives you the clocks and the seek hooks. citeturn3search0turn9search14turn0search6

### 5) Pause/resume synchronization
For `HTMLMediaElement`, pausing a selected set is straightforward: pause the selected elements together, capture the shared logical position, then resume from that same position later. For Web Audio, `AudioContext.suspend()` pauses the progression of the audio-context clock, and `resume()` continues it. However, if the current playback mode uses `AudioBufferSourceNode`, you still need to recreate the source node on resume because the node is single-use. That is the most important transport rule to remember when designing a synchronized pause/resume controller. citeturn4search0turn6search1turn0search14

### 6) Muting or enabling subsets of tracks
If the app needs track groups, solos, mutes, or per-track enable toggles, Web Audio routing is the cleaner abstraction. `GainNode` is the normal tool for muting and unmuting a track or subgroup by setting gain to 0 or restoring it to 1. `HTMLMediaElement.muted` works for direct media-element transport, but it is less flexible for subgroup routing and analysis taps. A good pattern is one gain node per track, optional subgroup gain nodes, and a master gain node before the destination. That keeps mute logic separate from transport logic. citeturn7search0turn7search1turn8search19

### 7) Waveform and timeline UI
`timeupdate` is too sparse to drive a smooth waveform cursor by itself, so the UI should usually poll on `requestAnimationFrame` or an equivalent visual loop and read from the chosen master clock. For waveform rendering, `AudioBuffer.getChannelData()` gives raw PCM samples, and MDN notes that `AnalyserNode` is suitable for real-time waveform or frequency visualizations. For a transcript tool, the better split is usually: precompute coarse waveform peaks for the static timeline, then use a fast visual loop for the playhead and selected range. `seekable` and `buffered` are useful for drawing what is playable now versus what is merely loaded. citeturn9search0turn15search0turn8search2turn12search0turn12search1

### 8) Local file loading limits in browsers
The browser File API is based on user-selected files, typically through `<input type="file">` or drag and drop. `FileReader.readAsArrayBuffer()` is the classic way to get binary audio data, and `Blob.text()` is the simplest way to read JSONL or other UTF-8 text inputs. Both APIs are available in workers, which makes them useful for large-file parsing without blocking the main thread. The File System Access API and `showOpenFilePicker()` can improve local-file workflows, but they are secure-context only and MDN marks `showOpenFilePicker()` as experimental, so they should be treated as a progressive enhancement rather than the base assumption. citeturn5search0turn5search2turn5search1turn5search3turn5search7

### 9) Browser compatibility concerns
Browser autoplay policy is a real constraint for both media elements and Web Audio. Chrome and WebKit document that audio playback often needs a user gesture, and MDN recommends creating or resuming the audio context inside a user-initiated event handler. `fastSeek()` has limited availability, so precise jumps should use `currentTime`. `AudioBuffer` is a memory-oriented format, so very long M4A recordings may be better handled by media-element transport. `AudioContext.resume()` and `suspend()` are broadly available, but the app should still handle the suspended state explicitly because browsers may start audio contexts suspended until the user interacts with the page. citeturn13search0turn4search0turn4search9turn0search10turn6search0turn4search3

### 10) Practical recommendation for this project
For a synchronized audio transcript tool, the lowest-risk browser design is usually a hybrid:
- use `HTMLMediaElement` for local-file transport and broad compatibility,
- use one `AudioContext` as the timing and routing layer,
- use `GainNode` for per-track and per-group mute control,
- use `currentTime` and `seeked` for exact group seeks,
- use `getOutputTimestamp()` plus a visual loop for playhead sync,
- reserve `AudioBufferSourceNode` for cases where the app can afford memory and needs the tightest schedule control. citeturn8search0turn8search1turn7search0turn3search0turn13search0turn6search1turn6search0

## Pseudocode Sketches
### Group seek with media elements
```ts
// Pseudocode only, not a final implementation
await Promise.all(selectedTracks.map(waitForMetadata));
pauseSelectedTracks();

for (const track of selectedTracks) {
  track.element.currentTime = clamp(targetSeconds + track.offsetSeconds, 0, track.duration);
}

await Promise.all(selectedTracks.map(waitForSeeked));
await resumeSelectedTracksAtSharedAnchor();
```

### Group seek with AudioBufferSourceNode
```ts
// Pseudocode only, not a final implementation
const anchor = audioCtx.currentTime + leadTimeSeconds;

for (const track of selectedTracks) {
  const source = audioCtx.createBufferSource();
  source.buffer = track.buffer;
  source.connect(track.gainNode);
  source.start(anchor, targetSeconds + track.offsetSeconds);
}
```

### Drift monitor sketch
```ts
// Pseudocode only, not a final implementation
const master = audioCtx.getOutputTimestamp();
const now = master.contextTime;
const driftSeconds = expectedSeconds - now;

if (Math.abs(driftSeconds) > driftThresholdSeconds) {
  resyncTrack();
}
```

## Common Pitfalls
- Using `timeupdate` as the main sync clock. It is useful for UI, but not for precise audio alignment. citeturn9search0
- Reusing an `AudioBufferSourceNode` after playback has started. It cannot be started again. citeturn6search1
- Assuming `fastSeek()` is precise or universally supported. Use `currentTime` for exact seeking. citeturn0search10turn9search14
- Loading audio into `AudioBuffer` when the recordings are long. MDN explicitly says `AudioBuffer` is intended for short snippets and longer sounds are better suited to media-element sources. citeturn6search0turn15search1
- Forgetting browser autoplay policy. Audio contexts often must be resumed from a user gesture. citeturn4search0turn4search9

## References
| Source | URL | Why it matters |
|---|---|---|
| MDN: HTMLMediaElement currentTime | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime | Defines precise media-element seeking. |
| MDN: HTMLMediaElement seeked event | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event | Needed to know when a group seek has completed. |
| MDN: HTMLMediaElement timeupdate event | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event | Explains why this event is too coarse for sync-critical UI. |
| MDN: HTMLMediaElement fastSeek() | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/fastSeek | Useful only for approximate seeks. |
| MDN: BaseAudioContext currentTime | https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime | The master audio clock for scheduled playback. |
| MDN: AudioContext getOutputTimestamp() | https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp | Maps audio time to performance time for drift/UI work. |
| MDN: AudioBufferSourceNode start() | https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start | Gives sample-accurate start/offset scheduling. |
| MDN: AudioBufferSourceNode | https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode | Documents single-use playback behavior. |
| MDN: AudioBuffer | https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer | Explains memory-oriented buffer playback and the short-snippet caveat. |
| MDN: AudioContext createMediaElementSource() | https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource | Bridges media elements into Web Audio routing. |
| MDN: GainNode gain | https://developer.mozilla.org/en-US/docs/Web/API/GainNode/gain | Mute/solo and subgroup control primitive. |
| MDN: File API | https://developer.mozilla.org/en-US/docs/Web/API/File_API | Covers user-selected local files in browsers. |
| MDN: FileReader readAsArrayBuffer() | https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsArrayBuffer | Binary file loading path for audio. |
| MDN: Blob text() | https://developer.mozilla.org/en-US/docs/Web/API/Blob/text | Simple JSONL/text ingestion path. |
| MDN: showOpenFilePicker() | https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker | Progressive-enhancement file picker with secure-context constraints. |
| MDN: AudioContext resume() | https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume | Required for explicit pause/resume behavior. |
| MDN: AudioContext suspend() | https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend | Pauses the audio clock and reduces hardware usage. |
| MDN: autoplay guide | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay | Explains the user-gesture requirement in practice. |
| Chrome Developers: Autoplay policy | https://developer.chrome.com/blog/autoplay/ | Browser-vendor confirmation of autoplay restrictions. |
| W3C Web Audio API 1.1 | https://www.w3.org/TR/webaudio-1.1/ | Primary spec context for clocking and scheduling behavior. |

### Recommended for Deep Reading
- `AudioContext.getOutputTimestamp()` MDN page: best source for the audio-to-performance clock mapping.
- `AudioBufferSourceNode.start()` MDN page: best source for exact seek/schedule semantics.
- W3C Web Audio API 1.1: useful when you need the normative clock and scheduling model, especially for reasoning about timing correction. citeturn3search0turn13search0turn3search9
