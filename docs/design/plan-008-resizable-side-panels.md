# Plan 008: Resizable Side Panels

## Provenance

- Refined request: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/refined-request-resizable-side-panels.md`
- Investigation: skipped; the app already uses CSS grid and no new technology choice is needed.
- Technical research: skipped; native pointer events and CSS variables are sufficient.
- Codebase scan: `/Users/giorgosmarinos/Documents/sync-transcript-studio/docs/reference/codebase-scan-resizable-side-panels.md`

## Objective

Let users resize the left sidebar and right processing panel while the transcript/review area fills the remaining space.

## Files to Modify

- `sync-transcript-studio/src/frontend/main.ts` - add width state, render handles, and handle pointer/keyboard resizing.
- `sync-transcript-studio/src/frontend/layout/resize.ts` - add clamping helpers with focused tests.
- `sync-transcript-studio/src/frontend/styles/app.css` - add CSS variables and resize handle styles.
- `sync-transcript-studio/tests/frontend/` - add resize helper tests.
- `docs/design/project-design.md`, `docs/design/project-functions.MD`, and `Issues - Pending Items.md` - document the change.

## Acceptance Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit`
