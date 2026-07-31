# Color Byte contributor guidance

## Architecture

- React owns the surrounding interface and summarized progress state.
- `createColoringBoard` owns pixel rendering, camera state, pointer input, painting, progress mutation, and render scheduling.
- Do not add one DOM element, React component, or React state value per pixel.
- Keep puzzle definitions immutable and player progress mutable.
- Store pixel data in flat typed arrays using row-major indexing: `y * width + x`.
- Keep communication from the Canvas controller to React limited to small callbacks carrying summarized state or a selected palette index.

## Levels menu

- `/` is the artwork menu and `/play/$levelId` is the board. An unknown id redirects home rather than erroring.
- The menu is a dense table of artwork beside `ArtworkPreviewPanel`. The pairing is the whole idea: a row can say how big a piece is and how far along it is, but it cannot show the art, and the panel shows the art the rows cannot. Neither side should repeat the other, which is why grid size and palette live only in the panel.
- The panel is driven by the `?artwork=` search param, so rows stay ordinary links and a chosen artwork can be shared. An artwork is always selected, defaulting to the first in the catalog, so the column is never an empty hole. There is therefore no "no selection" state and no close button.
- Counts, not percentages, wherever a number stands for "finished": a 4,096 cell board rounds to 100% with cells still unpainted. Percent is fine for the meter, which is proportional anyway.
- A preview shows an artwork in exactly one of two states and never between them: full color once the artwork is finished, or the muted target tone the minimap uses when it is not. Do not render a part-painted thumbnail; how far along a player is belongs in the text beside the picture, never in the picture.
- Only an untouched board wears the grid and the cell numbers, which is what distinguishes a board from a finished print. Both are gated on cell size so small thumbnails do not turn to noise. Cell size floors to a whole number of pixels, which is what keeps the art crisp.
- The palette strip always shows an artwork's true colors, dimming a swatch once that color has no cells left. That matches what the board's own palette does with a finished color, and it means the strip describes the artwork even at 0%.
- "See full artwork" is the one place a colored artwork appears before it is finished, because the player asked for it. Keep the reveal local to the component and drop it whenever the selection changes, so it can never leak into the menu behind it.
- "Start over" is deliberately inert. What it should do to stored progress is undecided, so it renders and does nothing rather than pretending.
- Nothing is persisted, so `describeLevel` reports every artwork as untouched and all its numbers are zero. That function is the seam where stored progress plugs in; keep every component reading its fields rather than assuming an empty board, or the menu will have to be rewritten when progress lands. Derive it once at module load, never per render.
- Importing belongs to the menu, not the board: the board is about painting one artwork. An imported piece is held in memory by `imported-levels.ts` and opened through `/play/$levelId` exactly like a catalogued one, so it does not survive a reload. Whatever storage arrives for progress should take imports with it.

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
