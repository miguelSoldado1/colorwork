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

- The interface chrome is deliberately near-colorless warm graphite so the puzzle artwork owns every saturated pixel on screen. The single accent is a muted sage sampled from the puzzle palette family; spend it only on selection, progress, and focus.
- Use the shadcn-style semantic Tailwind colors defined in `src/styles/index.css`; reserve `canvas` for the coloring surface and `canvas-edge` for the board outline the Canvas controller strokes.
- Do not introduce Tailwind's generic color palette into the game interface unless a new semantic token is deliberately added first. The one exception is ink computed against an arbitrary puzzle swatch, which no fixed token can serve.
- Prefer hairline borders and tone steps over heavy drop shadows. The board canvas is the only element that should read as lifted.
- The completion burst is the one colored moment, and it stays artwork-agnostic by construction: every particle takes a color from the puzzle's own palette, so no fixed accent is imposed on the art. It emits at the board edge and travels outward, keeping the artwork itself clear.
- Its shape lives in the `CONFETTI` constant; the CSS reads `--fly-*` custom properties so the tuned values stay in one place.
- A shrink-wrapping element around the canvas gives the burst the board's box without measuring it. Keep transforms off that chain: a transform there would smear the axis-aligned particles.
- Preserve accessible labels, pressed states, focus states, and touch-friendly control sizes.
- The tool rail is a horizontal scrolling strip above the board on phones and a vertical rail beside it from `sm` up. Panels that hold overflowing content need `min-w-0`, or the grid and flex parents floor at `min-content` and clip instead of scrolling.

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
