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
- The panel is driven by client-side selection state in `LevelsMenu`, so choosing a row never changes the URL. An artwork is always selected, defaulting to the first in the catalog, so the column is never an empty hole. There is therefore no "no selection" state and no close button.
- Counts, not percentages, wherever a number stands for "finished": a 4,096 cell board rounds to 100% with cells still unpainted. Percent is fine for the meter, which is proportional anyway.
- A preview shows an artwork in exactly one of two states and never between them: full color once the artwork is finished, or the muted target tone the minimap uses when it is not. Do not render a part-painted thumbnail; how far along a player is belongs in the text beside the picture, never in the picture.
- Only an untouched board wears the grid and the cell numbers, which is what distinguishes a board from a finished print. Both are gated on cell size so small thumbnails do not turn to noise. Cell size floors to a whole number of pixels, which is what keeps the art crisp.
- The palette strip is a plain rendering of an artwork's true colors and carries no progress. It describes what the piece is made of, the same way the grid size does; how far along each color is belongs to the text and the meter beside it. The board's own palette still dims a spent color, because there the swatch is a control you are choosing between, not a description.
- "See full artwork" is the one place a colored artwork appears before it is finished, because the player asked for it. Keep the reveal local to the component and drop it whenever the selection changes, so it can never leak into the menu behind it.
- "Start over" clears an artwork's stored progress through `clearPuzzleProgress`, and is disabled on a board that was never started. It confirms in place rather than in a dialog: the panel already names the artwork it would clear, so darkening the menu behind a modal would only repeat what the player is looking at. Both states occupy one grid cell so the confirmation cannot shift the panel, and Escape backs out. It sits below a hairline rule rather than inside the action pair above it, because clearing a board is not another way of looking at one, and it stays muted until hovered: a destructive action should never outweigh the primary one beside it. It is also the only way to repaint a finished artwork, since opening one restores the finished board; that is why the primary action there reads "Open the finished board" rather than promising a repaint the route does not perform.
- Stored progress reaches the menu only through `describeLevel`, which folds a puzzle and its saved progress into the one shape every component reads. Keep components reading its fields rather than the store or the raw pixel arrays, and read the catalog once per mount and again on a storage change, never per render. Imported artwork has no storage yet, so it still reports zeros.
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
- A swatch dims once its colour has no cells left, but not when every colour is spent: at that point dimming would gray out the whole finish instead of pointing anywhere.
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
- Numbers are off by default because a board full of them is noisy, and the toggle always draws them when asked: a control that silently does nothing at some zoom levels is worse than cramped glyphs. Their scale floors to a whole number of pixels and never below 1, so they stay crisp instead of losing rows to an unsmoothed downscale. They remain independently toggleable from the selected-color highlight.
- An unpainted board is never blank: it wears the minimap's grayscale target at a low alpha, under a translucent wash on the selected color's cells. The guide fades as the board fills, or it would camouflage the last holes against the paint around them.
- The minimap starts with a muted grayscale target and overlays painted pixels in their true colors. It shares the target layer with the board's guide, so the tone curve lives in `mutedTargetGray` alone.

## Validation

Before handing off a change, run:

```sh
pnpm typecheck
pnpm check
pnpm build
```
