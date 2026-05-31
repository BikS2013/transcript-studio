import Foundation
import AVFoundation
import CoreMedia
import Speech

struct Segment: Codable {
    let text: String
    let startMs: Int
    let endMs: Int
    let confidence: Double?
}

struct Output: Codable {
    let provider: String
    let locale: String
    let inputPath: String
    let segments: [Segment]
}

func argumentValue(_ name: String) -> String? {
    let args = CommandLine.arguments
    guard let index = args.firstIndex(of: name), args.indices.contains(index + 1) else {
        return nil
    }
    return args[index + 1]
}

guard let inputPath = argumentValue("--input"), !inputPath.isEmpty else {
    fputs("--input is required\n", stderr)
    exit(2)
}

guard let localeIdentifier = argumentValue("--locale"), !localeIdentifier.isEmpty else {
    fputs("--locale is required\n", stderr)
    exit(2)
}

if #available(macOS 26.0, *) {
    let locale = Locale(identifier: localeIdentifier)
    let transcriber = SpeechTranscriber(locale: locale, preset: .timeIndexedTranscriptionWithAlternatives)
    guard SpeechTranscriber.isAvailable else {
        fputs("SpeechTranscriber is unavailable on this system\n", stderr)
        exit(3)
    }

    let installedLocales = await SpeechTranscriber.installedLocales
    guard installedLocales.contains(locale) else {
        fputs("Requested locale is not installed for local speech transcription: \(localeIdentifier)\n", stderr)
        exit(3)
    }

    let analyzer = SpeechAnalyzer(modules: [transcriber])
    let inputUrl = URL(fileURLWithPath: inputPath)
    let audioFile = try AVAudioFile(forReading: inputUrl)

    let resultsTask = Task<[Segment], Error> {
        var collected: [Segment] = []
        for try await result in transcriber.results {
            guard result.isFinal else {
                continue
            }
            let text = String(result.text.characters)
            let startMs = Int(result.range.start.seconds * 1000)
            let endMs = Int(result.range.end.seconds * 1000)
            collected.append(Segment(text: text, startMs: startMs, endMs: endMs, confidence: nil))
        }
        return collected
    }

    try await analyzer.prepareToAnalyze(in: audioFile.processingFormat)
    _ = try await analyzer.analyzeSequence(from: audioFile)
    try await analyzer.finalizeAndFinishThroughEndOfInput()
    let segments = try await resultsTask.value

    let output = Output(provider: "apple-local", locale: localeIdentifier, inputPath: inputPath, segments: segments)
    let data = try JSONEncoder().encode(output)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} else {
    fputs("Apple local transcription requires macOS 26.0 or later\n", stderr)
    exit(3)
}
