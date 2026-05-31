# Plan 009: Self-Contained Relocation

## Provenance

- Refined request: `docs/reference/refined-request-move-sync-transcript-studio.md`
- Investigation: skipped because this is a localized documentation and filesystem restructuring with a single obvious target.
- Technical research: skipped because no new technology or dependency is introduced.
- Codebase scan: skipped because no application source behavior is changing.

## Objective

Move all Sync Transcript Studio-specific documents into the application folder, make the folder self-described for future agents and maintainers, and relocate the complete app outside the original `GTF-prep-call` parent folder.

## Files and Directories to Modify

- `AGENTS.md` - add package-local agent instructions and a concise Tools section.
- `README.md` - document that the app is standalone and point to package-local docs.
- `Issues - Pending Items.md` - keep Sync Transcript Studio issues, completed items, and dependency vetting history at the app root.
- `docs/design/` - keep Sync Transcript Studio plans, proposal, mockups, project design, and project functions.
- `docs/reference/` - keep relevant refined requests, scans, reports, dependency validation, and implementation references.
- `docs/research/` - keep research used by Sync Transcript Studio decisions.
- `docs/tools/sync-transcript-studio.md` - keep the dedicated tool documentation.

## Implementation Notes

- Move standalone Sync Transcript Studio documentation files directly into the app.
- Create filtered package-local versions of mixed documents, such as `project-design.md`, `project-functions.MD`, and `Issues - Pending Items.md`, so unrelated audio-agent and skill-registry material does not become part of the standalone app.
- Preserve package-local runtime artifacts that already belong to the app, including `exports/`, `dist/`, `.sync-transcript-studio/`, and `node_modules/`.
- Move the final folder to `/Users/giorgosmarinos/Documents/sync-transcript-studio` if that destination does not already exist.

## Acceptance Checks

- The relocated app contains `README.md`, `AGENTS.md`, `Issues - Pending Items.md`, `docs/design/project-design.md`, `docs/design/project-functions.MD`, `docs/reference/`, `docs/research/`, and `docs/tools/sync-transcript-studio.md`.
- The previous nested path no longer exists after relocation.
- `npm test` passes from the relocated app root.
- `npm run build` passes from the relocated app root.
