# Refined Request: Move Sync Transcript Studio Into a Self-Contained Application Folder

## Category
Infrastructure / Documentation

## Objective
Make `sync-transcript-studio/` self-described and self-contained by moving all Sync Transcript Studio-specific documentation and project guidance into that folder, then move the complete application folder outside `/Users/giorgosmarinos/Documents/GTF-prep-call`.

## Scope
In scope:
- Identify documentation and reference files that are specifically needed to understand, maintain, run, test, or continue developing Sync Transcript Studio.
- Move those files under `sync-transcript-studio/docs/` using the existing project documentation conventions.
- Add or update package-local self-description files so future agents can work from inside `sync-transcript-studio/` without relying on the parent `GTF-prep-call` folder.
- Preserve the application's source code, tests, package metadata, generated outputs, staged local inputs, and current README.
- Move the resulting `sync-transcript-studio/` directory to `/Users/giorgosmarinos/Documents/sync-transcript-studio` unless that destination already exists.

Out of scope:
- Changing Sync Transcript Studio application behavior.
- Moving unrelated `audio-ffmpeg-pi-agent`, Greek fintech panel, or skill-source registry materials into the app.
- Creating a git commit or performing version-control operations.
- Deleting unrelated source recordings or transcript artifacts from `GTF-prep-call`.

## Requirements
- The moved application must include its relevant `docs/design`, `docs/reference`, `docs/research`, and `docs/tools` material.
- The package must include an `AGENTS.md` that starts with the current "Structure & Conventions" chapter from the user-level instructions and includes a concise Tools section for Sync Transcript Studio.
- `docs/design/project-design.md` must reflect the relocation and self-contained application decision.
- `docs/design/project-functions.MD` must retain Sync Transcript Studio function requirements.
- `Issues - Pending Items.md` must exist at the package root.
- The move must avoid overwriting an existing `/Users/giorgosmarinos/Documents/sync-transcript-studio` directory.
- The app must still build and test from its new location if dependencies and external prerequisites are present.

## Constraints
- Do not perform version-control operations.
- Do not revert unrelated user changes.
- Do not introduce new runtime dependencies.
- Use explicit file operations and verify the resulting structure.
- If destination conflicts exist, stop and report instead of overwriting.

## Acceptance Criteria
- `/Users/giorgosmarinos/Documents/sync-transcript-studio` exists after the move.
- The original `/Users/giorgosmarinos/Documents/sync-transcript-studio` path no longer exists after a successful move.
- The relocated app contains `README.md`, `AGENTS.md`, `Issues - Pending Items.md`, `docs/design/project-design.md`, `docs/design/project-functions.MD`, `docs/reference/`, `docs/research/`, and `docs/tools/sync-transcript-studio.md`.
- Sync Transcript Studio-specific plans, refined requests, scans, implementation reports, test reports, investigations, and research documents are present under the relocated app's `docs/` tree.
- Unrelated Audio FFmpeg PI Agent and skill-source materials remain outside the relocated app.
- `npm test` and `npm run build` are run from the relocated application folder, or any inability to run them is reported with the exact reason.

## Assumptions
- "Outside the current folder" means moving the package from `/Users/giorgosmarinos/Documents/sync-transcript-studio` to `/Users/giorgosmarinos/Documents/sync-transcript-studio`.
- "Documents needed" means documents related to Sync Transcript Studio, including its design, plans, research, reference reports, tool documentation, project functions, pending items, and agent instructions.
- The existing `node_modules`, `dist`, `.sync-transcript-studio`, and `exports` folders should move with the application because they are currently package-local artifacts.

## Open Questions
- Should any source recordings or transcript files from the parent `GTF-prep-call` folder be copied into the relocated app as sample inputs, or should the app remain source-data-light and use only package-local staged/export artifacts?

## Original Request
"i want you to move all the documents needed under the sync-transcript-studio
Let me make it a self described and contained application and move it outside the current folder."
