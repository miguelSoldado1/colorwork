# Color Byte contributor guidance

## Architecture

- React owns the surrounding interface and summarized progress state.
- `createColoringBoard` owns pixel rendering, camera state, pointer input, painting, progress mutation, and render scheduling.
- Do not add one DOM element, React component, or React state value per pixel.
- Keep puzzle definitions immutable and player progress mutable.
- Store pixel data in flat typed arrays using row-major indexing: `y * width + x`.
- Keep communication from the Canvas controller to React limited to small callbacks carrying summarized state or a selected palette index.

## React and TypeScript

- React Compiler is enabled. Do not add `useCallback`, `useMemo`, or `memo` by default; add manual memoization only when profiling demonstrates a need.
- The `noJsxPropsBind` lint rule is intentionally disabled because React Compiler handles useful callback stabilization.
- Prefer inferred TypeScript types. Add explicit types when they define a domain boundary, constrain an otherwise narrow inference, or document an imperative API.
- Keep components grouped by feature under `src/components` and import files directly. Avoid barrel files.

## Styling

- Use the shadcn-style semantic Tailwind colors defined in `src/styles/index.css`; reserve `canvas` for the coloring surface.
- Do not introduce Tailwind's generic color palette into the game interface unless a new semantic token is deliberately added first.
- Preserve accessible labels, pressed states, focus states, and touch-friendly control sizes.

## Canvas behavior

- Keep Canvas rendering crisp and device-pixel-ratio aware with image smoothing disabled.
- Coalesce drawing with `requestAnimationFrame` and render only visible cells where practical.
- Update progress incrementally; do not rescan the whole puzzle during painting.
- Pencil strokes stop at the Canvas boundary and must not interpolate across an outside-pointer gap.
- Bucket fill is limited to the visible cell rectangle captured when the fill begins.
- Middle-click selects the target color of the clicked cell without painting it.
- Zoom buttons use fixed, cursor-centered zoom steps. Panning remains a separate tool.
- Numbers are drawn only above the configured cell-size threshold and remain independently toggleable from the selected-color highlight.
- The minimap starts with a muted grayscale target and overlays painted pixels in their true colors.

## Validation

Before handing off a change, run:

```sh
pnpm typecheck
pnpm check
pnpm build
```
