# Colorwork contributor guidance

Read [docs/design-notes.md](docs/design-notes.md) before changing product behavior, board interactions, or the visual language.

## Architecture

- React owns the surrounding interface and summarized progress state.
- `createColoringBoard` owns pixel rendering, camera state, pointer input, painting, progress mutation, and render scheduling.
- Do not add one DOM element, React component, or React state value per pixel.
- Keep puzzle definitions immutable and player progress mutable.
- Order puzzle palettes by descending target-pixel count, most-used color first. Remap `targetPixels` indices when reordering so the artwork stays unchanged.
- Store pixel data in flat typed arrays using row-major indexing: `y * width + x`.
- Keep Canvas-to-React communication to small callbacks carrying summarized state or a selected palette index.
- Stored progress reaches the menu through `describeLevel`. Components should not read the progress store or raw pixel arrays directly.
- Imported artwork belongs to the menu and opens through `/play/$levelId` like catalog artwork. Its definition and progress persist in IndexedDB, and only imported artwork can be deleted.

## React and TypeScript

- React Compiler is enabled. Do not add `useCallback`, `useMemo`, or `memo` unless profiling demonstrates a need.
- The `noJsxPropsBind` lint rule is intentionally disabled because React Compiler handles callback stabilization.
- Prefer inferred TypeScript types. Add explicit types at domain boundaries or where they prevent unwanted narrowing.
- Group components by feature under `src/components` and import files directly. Avoid barrel files.

## Interface

- Use the shadcn-style semantic Tailwind colors in `src/styles/index.css`. Reserve `canvas` for the coloring surface and `canvas-edge` for its outline.
- Do not use Tailwind's generic color palette for interface chrome without first adding an intentional semantic token. Ink computed against arbitrary puzzle swatches is the exception.
- Prefer hairline borders and tone steps over heavy shadows. The board Canvas is the only lifted surface.
- Preserve accessible labels, pressed states, focus states, and touch-friendly control sizes.
- Keep button labels unchanged while an action is pending. Use a separate indicator when the loading state needs to be visible.
- Keep the tool rail horizontally scrollable above the board on phones and vertical beside it from `sm` upward.
- Give overflowing grid and flex children `min-w-0` so they scroll instead of clipping at their min-content width.

## Canvas behavior

- Keep rendering crisp and device-pixel-ratio aware, with image smoothing disabled.
- Coalesce drawing with `requestAnimationFrame` and render only visible cells where practical.
- Update progress incrementally; do not rescan the full puzzle during painting.
- Stop pencil strokes at the Canvas boundary and never interpolate across an outside-pointer gap.
- Limit bucket fill to the visible cell rectangle captured when the fill starts.
- Keep middle-click color selection, cursor-centered fixed zoom steps, and panning as a separate tool.
- Numbers must remain independently toggleable and visible at every zoom when enabled. Floor their scale to whole pixels, never below 1.
- Keep the board guide and minimap target based on the shared `mutedTargetGray` tone curve.

## Routes and menu data

- `/` is the artwork menu and `/play/$levelId` is the board. Redirect unknown ids home.
- `/photo-to-pixel-art` is the search landing page for importing. It shares the menu's import flow through `useImageImport`.
- Keep artwork selection on the menu in client state; selecting a row must not change the URL.
- Always select an artwork when the catalog is nonempty. Do not add a no-selection state or close button to the preview.
- Use completed-cell counts in text. Percentages are allowed only for proportional meters.
- Read the catalog once per mount and again after relevant storage changes, not once per render.

## Validation

Before handing off a change, run:

```sh
pnpm typecheck
pnpm check
pnpm build
```

Run the relevant unit or browser tests for behavior you change.
