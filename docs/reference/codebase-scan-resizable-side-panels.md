---
language: TypeScript
framework: none
package_manager: npm
build_command: npm run build
test_command: npm test
lint_command: null
entry_points:
  - src/frontend/main.ts
last_scanned_commit: null
request_file: docs/reference/refined-request-resizable-side-panels.md
scan_scope: sync-transcript-studio/src/frontend
generated_at: 2026-05-31T13:20:00Z
---

# Codebase Scan: Resizable Side Panels

## Module Map

- `sync-transcript-studio/src/frontend/main.ts` renders the app shell, `workspace`, `sidebar`, `review`, `review-grid`, transcript panel, and processing panel. It also owns delegated UI events and app state.
- `sync-transcript-studio/src/frontend/styles/app.css` defines the current fixed grid widths: `workspace` uses `minmax(280px, 360px) minmax(0, 1fr)`, while `review-grid` uses `minmax(0, 1fr) minmax(300px, 380px)`.
- `sync-transcript-studio/tests/frontend/` contains small pure frontend helper tests and API-client tests, but no DOM-layout harness.

## Conventions

- Frontend state lives in a single `AppState` object in `main.ts`.
- UI is rendered from template functions and controlled through delegated event listeners.
- CSS uses work-focused panel/grid primitives and responsive media queries at `1080px` and `720px`.
- Existing responsive behavior stacks `workspace` and `review-grid` to one column below `1080px`.

## Integration Points

### In Scope

- `src/frontend/main.ts` - add layout width state, render resize handles, pointer event handling, and CSS variable updates.
- `src/frontend/styles/app.css` - replace fixed grid columns with CSS variables and add resize handle styling.
- `tests/frontend/` - add pure width-clamping tests because the current suite does not include DOM drag simulation.

### Out of Scope

- Backend routes and shared DTOs.
- Audio runtime/playback logic.
- Transcript parsing and local file staging.

## Duplication Check

No current resize handles or panel width state exist. The feature should extend the existing grid layout rather than introduce a separate layout system.
