# Refined Request: Transcript Studio CLI and Electron App

## Category
Development

## Objective
Rename the project identity from Sync Transcript Studio to Transcript Studio and define the work needed to make the project available as both a documented command-line tool and an Electron desktop UI app, while preserving the existing local-first synchronized M4A playback, JSONL transcript navigation, and non-destructive FFmpeg-backed export behavior. The implementation must follow the repository's AGENTS.md documentation, planning, tool, dependency-vetting, and project-structure conventions.

## Scope
- **In scope**:
  - Rename the active project/tool identity to Transcript Studio across user-facing application surfaces, package metadata, CLI command naming, Electron app naming, and current project documentation.
  - Define a first-class CLI tool surface for launching and/or operating Transcript Studio from the command line.
  - Define an Electron desktop UI app surface that provides the existing local review workspace as a desktop application.
  - Preserve the existing local-first privacy model, staged local file handling, FFmpeg/ffprobe processing model, transcript JSONL workflows, non-destructive output handling, and package-local validation behavior.
  - Update required project documentation during implementation, including `AGENTS.md`, `docs/tools/`, `docs/design/project-design.md`, `docs/design/project-functions.MD`, and `Issues - Pending Items.md`.
  - Apply AGENTS.md workflow requirements for downstream work: investigation/research where needed, codebase scanning, planning under `docs/design/`, dependency vetting before adding Electron or CLI-related dependencies, and test/audit verification.
- **Out of scope**:
  - Implementing the rename, CLI, Electron app, or packaging changes as part of this refinement.
  - Changing the core audio/transcript feature set beyond what is necessary to expose the existing functionality through CLI and Electron surfaces.
  - Introducing hosted/cloud processing, remote storage, authentication, databases, or external upload workflows.
  - Performing version-control operations.
  - Finalizing distribution channels, code signing, notarization, auto-update infrastructure, or installer publishing unless explicitly added by a later request.

## Requirements
1. The project must adopt `Transcript Studio` as the user-facing product name and `transcript-studio` as the default machine-facing command/package identifier unless downstream planning identifies a blocking package or command conflict.
2. Existing historical reference artifacts may keep their original names, but active documentation, current package metadata, runtime UI labels, CLI help text, and tool references must clearly use the new Transcript Studio identity.
3. The CLI surface must provide a documented executable command named `transcript-studio` unless a conflict is discovered and documented.
4. The CLI surface must define its supported commands, flags, required prerequisites, error behavior, and examples in the dedicated tool documentation under `docs/tools/`.
5. The CLI must fail explicitly when required executables or configuration values are missing; it must not substitute fallback configuration values.
6. The Electron UI app must provide a desktop application entry point for the existing local workspace without uploading audio or transcript files to external services.
7. The Electron UI app must preserve the existing source-file safety rules: original audio and transcript files are never overwritten, and derived outputs use explicit names with collision checks.
8. The CLI and Electron UI must reuse the project's existing TypeScript code and local processing behavior where practical, avoiding parallel implementations of the same core audio/transcript logic.
9. Any new runtime or development dependency, especially `electron` or Electron build/package tooling, must be vetted before being added according to AGENTS.md dependency-vetting rules and recorded in `Issues - Pending Items.md`.
10. The downstream implementation plan must identify whether investigation, technical research, and codebase scanning are required before implementation, and must reference the resulting files from the plan.
11. Project documentation must be updated during implementation so `docs/design/project-design.md` records the design decisions and `docs/design/project-functions.MD` registers any new or changed functional requirements for the CLI and Electron app.
12. Tool documentation must follow the repository tool conventions. The project `AGENTS.md` must keep only concise tool references and must point to the dedicated `docs/tools/<tool-name>.md` documentation.
13. If new configuration options are introduced, `docs/design/configuration-guide.md` must document configuration sources, priority, variable purpose, how to obtain values, recommended storage, valid options, default values if any are explicitly allowed, and expiration metadata for expiring credentials or tokens.
14. Validation must include relevant package-local checks, at minimum typecheck, tests, build, audit, and a demonstrable smoke test for both the CLI entry point and Electron UI entry point.
15. The implementation must not remove or regress existing browser workspace behavior unless a later plan explicitly scopes that change and records the rationale.

## Constraints
- Current project root: `/Users/giorgosmarinos/Documents/sync-transcript-studio`.
- Current package metadata uses `"name": "sync-transcript-studio"` and exposes a `sync-transcript-studio` bin entry.
- Current project design describes a local-first TypeScript browser workspace served by a Node.js/TypeScript backend.
- Existing functional requirements F-001 through F-030 define synchronized M4A playback, transcript JSONL navigation, FFmpeg/ffprobe processing, staging, collision safety, local media streaming, and self-contained documentation behavior that must remain valid unless explicitly revised.
- Tool implementation in this project must be TypeScript.
- No version-control operation may be performed unless explicitly requested by the user.
- Missing configuration values must raise explicit errors; fallback configuration values are not allowed.
- Any test script created outside the package test suite must live under `test_scripts/`.
- Plans must be created under `docs/design/` using the `plan-xxx-<indicative description>.md` naming convention.
- Reference material must be kept under `docs/reference/`.
- Functional requirements and feature descriptions must be registered in `docs/design/project-functions.MD`.
- Dependency vetting and package audit are mandatory before and after adding dependencies.

## Acceptance Criteria
1. A downstream implementation plan can identify all files and documents that need updates for the rename, CLI surface, and Electron app without referring back to the raw request.
2. The specification clearly distinguishes active rename targets from historical artifacts that may retain old names.
3. The specification defines verifiable CLI expectations: command name, documented usage, explicit error behavior, and smoke-test validation.
4. The specification defines verifiable Electron expectations: desktop app entry point, local-first behavior, existing workflow preservation, and smoke-test validation.
5. The specification requires AGENTS.md-compliant documentation updates for project design, functional requirements, tool documentation, configuration guidance where applicable, and pending/completed issue tracking.
6. The specification requires dependency vetting before adding Electron or packaging dependencies and requires an audit after installation.
7. The specification excludes implementation work, hosted/cloud features, distribution publishing, and version-control operations from this refinement.
8. Open questions are documented so downstream planning can resolve them before implementation choices are made.

## Assumptions
- `Transcript Studio` is the intended product/display name, and `transcript-studio` is the intended package, binary, and tool slug unless a naming conflict is discovered.
- "Make it a CLI tool" means providing a supported command-line entry point for launching and/or operating the local Transcript Studio tool, not necessarily implementing every audio/transcript workflow as fully headless batch subcommands.
- "Make it an Electron UI app" means packaging the existing local browser workspace as a desktop UI, not redesigning the product or replacing the current frontend.
- The existing browser-served workspace should remain usable after the CLI and Electron additions unless the user later requests an Electron-only product.
- Distribution packaging beyond a locally runnable Electron app is not required unless requested later.

## Open Questions
- Should the CLI only launch/manage the local workspace, or should it also expose headless commands for probing media, loading transcripts, exporting audio, and generating transcript presentations?
- Should the Electron app be a development/runtime wrapper around the existing backend and frontend, or should downstream planning consider a fuller desktop architecture with separate main/preload/renderer boundaries and packaged native assets?
- Should the legacy `sync-transcript-studio` command remain as a backwards-compatible alias, or should it be replaced completely by `transcript-studio`?
- Which operating systems must the Electron app support for the first implementation slice: macOS only, or macOS plus Windows/Linux?
- Is installer/distribution packaging required now, or is a locally runnable Electron app sufficient for the first implementation?

## Original Request
```text
i want to name this project transcript-studio 
i want you to make it both a cli-tool 
and a electron ui app

I want you to follow the agents.md instructions on how to document and structure both
```
