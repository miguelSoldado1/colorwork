# Colorwork

A browser-based pixel color-by-number prototype built with React, Vite, TypeScript, Tailwind CSS, React Compiler, and Canvas 2D.

## Controls

- Select a numbered swatch to choose a color.
- Use the pencil to paint matching cells. Incorrect colors are ignored.
- Drag the pencil to paint a continuous line without skipping cells.
- Use the bucket to fill a connected matching region within the current viewport.
- Use the pipette to select the color assigned to a cell.
- Select a zoom tool, then click the part of the board that should stay under the cursor.
- Use the hand tool to pan while zoomed in.
- Middle-click a cell to select its color without switching tools.
- Use the eye button to show or hide cell numbers without hiding the selected-color highlight.

The bottom-left minimap shows the target in muted grayscale, overlays completed pixels in their actual colors, and marks the current viewport. Click or drag the minimap to pan the board directly.

## Architecture

React renders the game interface and receives summarized progress updates. The Canvas board is controlled imperatively by plain TypeScript, which owns rendering, camera state, pointer handling, painting, and frame scheduling. Painting a pixel does not create a DOM element or React state update for that pixel.

Puzzle definitions and progress use flat typed arrays with row-major indexing. The prepared test puzzle is currently 160×80 logical pixels.

```text
src/
├── app/          Application composition and React state
├── coloring/     Imperative Canvas controller and progress logic
├── components/   Board, palette, progress, and toolbar UI
├── puzzles/      Prepared puzzle definitions
└── styles/       Tailwind theme and global styles
```

## Development

```sh
pnpm dev
```

Set `VITE_DEBUG` locally to show a debug-only checkbox that temporarily fills the canvas. Unchecking it restores the progress from before the debug fill. The control is disabled in production builds even if the variable is set.

```sh
VITE_DEBUG=1 pnpm dev
```

```sh
pnpm check
pnpm typecheck
pnpm build
```
