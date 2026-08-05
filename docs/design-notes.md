# Colorwork design notes

This document records the product and interaction decisions that are easy to lose when looking only at the code. It explains the intended behavior; `AGENTS.md` contains the concise implementation constraints.

## Product shape

Colorwork has two main views: the artwork menu at `/` and a coloring board at `/play/$levelId`. An unknown artwork id redirects to the menu because it is a dead end rather than an error the player can resolve.

The interface chrome is deliberately near-colorless warm graphite so the artwork owns every saturated pixel. A muted sage is the single interface accent and is reserved for selection, progress, and focus.

## Artwork menu

The menu pairs a dense artwork table with `ArtworkPreviewPanel`. The table communicates title and progress; the panel supplies the visual preview, grid size, and palette. Neither side should repeat information that the other communicates better.

Selection is client-side and never changes the URL. The first catalog entry is selected initially, so the preview column is never an empty hole and needs neither a no-selection state nor a close button.

When text describes completion, it uses painted and total cell counts rather than a rounded percentage. A meter can use a percentage because it is only a proportional visual; text such as `100%` can be false while cells remain unfinished on a large board.

### Preview states

An artwork preview has exactly two normal states:

- A finished artwork appears in full color.
- An unfinished artwork appears in the same muted target tone as the minimap.

The preview never shows partially painted progress. Progress belongs in the adjacent text and meter, while the image communicates the artwork itself.

Artwork previews never display cell numbers. Cell size is floored to a whole pixel to keep the preview crisp.

The palette strip always shows the artwork's true colors and carries no progress state. It describes what the piece contains. This differs from the board palette, where a swatch is an active control and can dim when its color is exhausted.

"See full artwork" is the one intentional way to reveal a colored artwork before completion. The reveal stays local to the preview and resets whenever selection changes, preventing one artwork's reveal state from leaking into another.

### Starting over

"Start over" clears stored progress through `clearPuzzleProgress` and is disabled for an untouched board. It is available in the menu preview and in the board header, so resetting never requires leaving the artwork. The board discards pending autosaves before removing the stored record, then rebuilds its live progress from an empty state. Neither control opens a modal: the surrounding artwork context already identifies what will be cleared, and a modal would obscure and repeat it.

The two views speak different languages, so the control is written twice on one shared confirm flow rather than reskinned with props. `useConfirmAction` owns the pending state, the focus handoff, and Escape; each control owns its own layout and wording.

The menu labels its buttons, so `StartOverControl` is a labelled button whose two states cross-fade inside one grid cell, below a hairline rule that separates it from the primary actions. The board is entirely icons with tooltips, so `StartOverPopover` matches: a muted icon in the header's action group, left of the hairline, with the progress meter kept as the rightmost thing in the header. Its confirmation is an anchored panel that scales from the control's top corner and sits directly beneath it. It crosses the header rule on the way down: reading as part of the control matters more than an unbroken hairline, and a larger offset made the panel look like it grew out of the header instead. Pressing elsewhere dismisses it and leaves focus where the player pressed; moving keyboard focus outside dismisses it too. Escape dismisses it and returns focus to the control. Once clearing begins, the confirmation remains in place until the operation succeeds or fails.

The board deliberately keeps the destructive control out of the title row. A touch-sized button there inflates the row that carries the artwork's name, which is identity rather than action.

Clearing progress is also the only way to repaint a finished artwork. Opening a finished piece restores its completed board, which is why its primary action says "Open the finished board."

### Data and imports

`describeLevel` combines a puzzle definition and its saved progress into the shape consumed by menu components. This keeps storage and raw pixel arrays out of the presentation layer.

Importing starts from the menu because the board is focused on painting one artwork. An imported image is converted into a puzzle, stored in IndexedDB, included after the built-in catalog entries, and opened through the normal board route. Its definition and progress persist across reloads.

## Coloring board

The Canvas controller owns rendering, camera state, input, painting, progress mutation, and render scheduling. React surrounds it with tools, palette, progress, and save status, receiving only summarized updates. This boundary keeps large boards from producing a React state update or DOM node per pixel.

An unpainted board is not blank. It shows the minimap's grayscale target at low opacity, with a translucent wash over cells belonging to the selected color. The guide fades as the board fills so it cannot camouflage the final unpainted cells among completed neighbors.

The minimap begins with the same muted grayscale target and overlays painted cells in their true colors. Both views share `mutedTargetGray`, keeping the tone curve consistent.

Numbers are off by default because they make a full board noisy. When the player enables them, they render at every zoom level: a visible control should not silently stop working. Their scale floors to a whole pixel and never drops below 1 so unsmoothed rendering remains crisp. Numbers and the selected-color highlight remain independent controls.

Pencil strokes stop at the Canvas edge and do not bridge gaps while the pointer is outside. Bucket fill operates only inside the visible cell rectangle captured when filling begins. Zoom steps are fixed and centered on the cursor; panning remains a separate tool. Middle-click selects a cell's target color without painting or changing tools.

## Palette and completion

An exhausted board-palette swatch dims to help the player find remaining colors. When every color is exhausted, none of the swatches dim; graying the whole palette would make the completed artwork feel drained without pointing to a useful next action.

Completion is the interface's one deliberately colorful moment. Every particle takes a color from the artwork's palette, so the effect remains artwork-specific without introducing a fixed celebratory accent. Particles originate at the board edge and travel outward, leaving the finished artwork unobscured.

The particle geometry lives in the `CONFETTI` constant, while CSS consumes its `--fly-*` custom properties. A shrink-wrapping element gives the effect the board's bounds without runtime measurement. Transforms stay off that wrapper chain because they would blur otherwise axis-aligned particles.

## Responsive layout and accessibility

On phones, the tool rail is a horizontal scrolling strip above the board. From the `sm` breakpoint upward, it becomes a vertical rail beside the board. Overflowing panels need `min-w-0`; otherwise grid and flex sizing floors them at their min-content width and causes clipping instead of scrolling.

Controls retain accessible labels, pressed states, visible focus states, and touch-friendly target sizes across both layouts.
