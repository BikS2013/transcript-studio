# Refined Request: Resizable Side Panels

## Category
Development

## Objective
Make Sync Transcript Studio's left sidebar and right processing panel resizable so users can allocate more screen space to tracks/session controls, transcript review, or processing outputs.

## Scope
- **In scope**:
  - Add a draggable vertical resize handle between the left sidebar and main review area.
  - Add a draggable vertical resize handle between the transcript panel and right processing panel.
  - Keep resizing bounded so panels remain usable and content does not collapse.
  - Preserve responsive behavior on smaller screens by disabling stacked-layout resize handles.
  - Preserve all existing audio, transcript, drag/drop, file-picker, playback, and processing behavior.
  - Add focused validation for resize width clamping.
  - Update project design/function/pending-items documentation.
- **Out of scope**:
  - Persisting panel sizes across browser sessions.
  - Resizing individual cards or vertical panel heights.
  - Changing app data models, backend APIs, audio processing, or transcript parsing.

## Requirements
1. Users must be able to drag a vertical handle to resize the left sidebar.
2. Users must be able to drag a vertical handle to resize the right processing panel.
3. The transcript/review area must use the remaining width.
4. Panel widths must be clamped to practical minimum and maximum values.
5. The UI must remain usable on narrow screens where panels stack vertically.
6. Existing controls must continue to work after resizing.

## Constraints
- The implementation target is `sync-transcript-studio/`.
- No new dependency is required.
- Validation must include `npm run typecheck`, `npm test`, `npm run build`, and `npm audit`.

## Acceptance Criteria
1. Dragging the left resize handle changes the sidebar width and the review area adjusts.
2. Dragging the right resize handle changes the processing panel width and the transcript panel adjusts.
3. Resizing cannot shrink either side panel below its usable minimum.
4. On tablet/mobile-width layouts, panels stack and resize handles do not interfere with content.
5. Package-local validation passes.

## Assumptions
- “Left side panel” means the existing sidebar containing Tracks and Session.
- “Right side panel” means the existing Processing panel to the right of the Transcript panel.
- Width persistence across page reloads is not required for this request.

## Open Questions
- Should panel widths be persisted in a later version?

## Original Request
“I want you to make the left and right side panels resizable to allow users to resize them and present more content or make them more convenient.”
