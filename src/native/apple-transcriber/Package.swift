// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "apple-transcriber",
    platforms: [.macOS(.v15)],
    targets: [
        .executableTarget(
            name: "apple-transcriber",
            path: "Sources/apple-transcriber"
        )
    ]
)
