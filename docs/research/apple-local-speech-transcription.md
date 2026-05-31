# Apple Local Speech Transcription Research

Research date: 2026-05-31

## Sources

- Apple Speech framework documentation: https://developer.apple.com/documentation/speech
- Apple SpeechAnalyzer documentation: https://developer.apple.com/documentation/speech/speechanalyzer
- Apple SpeechTranscriber documentation: https://docs.developer.apple.com/tutorials/data/documentation/speech/speechtranscriber.md
- Apple SpeechTranscriber.Result documentation: https://docs.developer.apple.com/tutorials/data/documentation/speech/speechtranscriber/result.md

## Relevant Capabilities

- Apple's Speech framework supports speech recognition for live or prerecorded audio.
- The modern `SpeechTranscriber` API is documented as available on macOS 26.0 and later, among other Apple platforms.
- `SpeechTranscriber` provides availability checks through `isAvailable` and locale checks through `supportedLocales` and `installedLocales`.
- `SpeechTranscriber.Result` represents a phrase or passage in order, and result text carries time-range and confidence attributes.
- Apple local transcription is a native-platform capability. Transcript Studio's TypeScript backend cannot call it directly without a native bridge or helper.

## Proposal Implications

- Implement Apple local transcription through a small macOS native helper, invoked from the TypeScript backend with `execFile`.
- Keep all CLI and Electron behavior behind the same backend provider abstraction, so both surfaces can use the Apple provider.
- Validate macOS version, helper availability, SpeechTranscriber availability, installed/supported locale, and model availability before starting a job.
- Fail explicitly when the Apple provider is requested on unsupported platforms or without required local speech assets.
- Treat Apple local as the privacy-preserving provider. It should not upload source audio.

## Capability Differences

- Segment timing and confidence can be supported through result attributes.
- Speaker diarization is not confirmed in the Apple SpeechTranscriber references reviewed here and should be marked unsupported until proven otherwise.
- Language detection is not equivalent to Soniox or ElevenLabs auto language identification; Apple transcription should require or infer a locale from configuration/user selection and report the locale used.

## Open Items

- Decide whether Transcript Studio should require macOS 26+ for Apple local transcription, or whether a separate legacy `SFSpeechRecognizer` helper should be investigated for older macOS versions.
- Validate whether M4A inputs need conversion to a SpeechAnalyzer-supported audio format before transcription.
