# Colorwork design notes

This document records the product and interaction decisions that are easy to lose when looking only at the code. It explains the intended behavior; `AGENTS.md` contains the concise implementation constraints.

## Product shape

Colorwork has two main views: the artwork menu at `/` and a coloring board at `/play/$levelId`. An unknown artwork id redirects to the menu because it is a dead end rather than an error the player can resolve.

The interface chrome is deliberately near-colorless warm graphite so the artwork owns every saturated pixel. A muted sage is the single interface accent and is reserved for selection, progress, and focus.

## Artwork menu

The menu pairs a dense artwork table with `ArtworkPreviewPanel`. The table communicates title and progress; the panel supplies the visual preview, grid size, and palette. Neither side should repeat information that the other communicates better.

Selection is client-side and never changes the URL. The first catalog entry is selected initially, so the preview column is never an empty hole and needs neither a no-selection state nor a close button.

The preview panel keeps its primary painting action at every viewport size. On phones, the fixed action is an additional shortcut while the player browses the artwork lists.

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

The board keeps the destructive control out of the title row, and keeps the row itself free of separate action buttons. Imported artwork is renamed by editing its title in place: the name is the control, marked only by a hairline beneath it that brightens on hover. A hidden description names the action for assistive technology without adding a redundant visual tooltip. A pencil button was tried first and rejected for two reasons. It repeats the glyph the pencil tool already owns in the rail, and on a phone its touch target truncated the name it was there to edit. The hairline is drawn with a box-shadow rather than a border so neither state contributes layout height, and the touch target is a pseudo-element extending above and below the text, which is why the truncation lives on an inner span where it cannot clip it.

The field that replaces the title inherits its size, weight, and left edge, so the name does not move when editing begins; only the actions arrive. It is sized by its own text rather than by the row, with a 12rem floor from `sm` upward so short names still have a clear editing surface. A name at the 60-character limit is never handed a narrower box to edit than it had to read. No fixed width could handle long names well. A 60-character name runs from roughly 730 to 1116 pixels at the desktop title size, depending on the letters. Browsers without content-sized fields fall back to the field taking the row, as phones always do, since 60 characters fit at no phone width. Below `lg` the header's secondary actions hide while the name is edited: the form and the board actions cannot share the row there, and the name is what the player came to change. Phones also swap the labelled Save and Cancel for 48-pixel icon controls.

The title line reserves only the 24 pixels the name itself needs, at every viewport. Rename controls are taller than that and overhang it into the header's bottom padding rather than growing the row, which is what keeps the two title states the same height and the board still. Twenty-four pixels is the smallest line that stops a 48-pixel control short of the header rule, so it is the floor: an earlier version reserved a phone-sized 48 for a rename button that no longer exists, and left the field sitting in visible dead space. From `sm` upward the actions stay put, the title line retains its original 24-pixel layout height, and 40-pixel Save and Cancel controls with text labels center over it without contributing to the header's height. Both title states reserve the same height so opening the form never shifts the title, header, or board. A failed save keeps the form open and answers in place: the hairline turns red, the name takes a brief damped shake, and the reason appears in an anchored card that displaces nothing; reduced-motion users receive the hairline without movement. Because saving disables the field, a failure returns focus to the name rather than dropping it on the document. Enter saves; Escape, Cancel, or leaving the control cancels. Renaming never changes the artwork id or rebuilds the live Canvas state.

Clearing progress is also the only way to repaint a finished artwork. Opening a finished piece restores its completed board, which is why its primary action says "Open the finished board."

### Data and imports

`describeLevel` combines a puzzle definition and its saved progress into the shape consumed by menu components. This keeps storage and raw pixel arrays out of the presentation layer.

Importing starts from the menu because the board is focused on painting one artwork. An imported image is converted into a puzzle, stored in IndexedDB, included after the built-in catalog entries, and opened through the normal board route. Its definition and progress persist across reloads.

Cropping is an optional import adjustment. The normal path still shows the processed puzzle first. "Adjust crop" opens a focused editor only when the player needs it. Cropping is a mode, and entering it moves nothing. The dialog holds one fixed size with a pinned header and footer over a scrolling body, so palette wrapping, an error, or a mode change cannot resize it or shift it in the viewport. The artwork box keeps its size and its top-left corner in both modes; cropping widens it across the settings column and gathers its own controls into a bar beneath it, so the stage grows from where it already was instead of the panel resizing. On wider screens the body is clipped and the settings column scrolls on its own, so the box fills its column from the dialog's own height rather than from whatever the settings happen to contain. The dialog is wide enough that this column is landscape, because imported artwork usually is. The crop action stays under the artwork as a quiet inline control rather than a block, since it adjusts what the box above it shows, and the slot it sits in is the same height as the crop bar that replaces it. The footer carries the mode's own actions, so only one primary action and one Cancel are ever on screen. Apply returns to the processed puzzle preview; Cancel or Escape discards the staged change and returns focus to the crop control. Reset recenters the image at its fitted scale, which is how an applied crop is undone. Changing the grid after applying a crop keeps its normalized center and zoom, then fits that selection to the new grid ratio.

A fixed frame uses the current grid aspect ratio while the image moves behind it. Dragging positions the image, the wheel zooms toward the pointer, arrow keys nudge, `+` and `-` step the zoom, and one slider covers the range. The grid size that Apply will produce appears as a quiet result caption below the crop preview. The zoom controls keep one compact line, so the changing result does not crowd them. Everything outside the frame sinks into the stage, which keeps the surrounding image readable as context without competing with the selection. The frame is marked by a hairline edge and registration marks that continue its edges into the masked margin, so nothing tinted sits on the artwork itself. Inside the frame, the selection is divided into the cells the grid will sample, which ties cropping to grid size; the lattice is dropped below the spacing where it would read as a grey wash rather than as cells.

Imported names are trimmed, fall back to "Custom puzzle" when empty, and are limited to 60 characters. Filename-derived defaults are constrained before import. Existing stored names that predate the limit remain unchanged until the player chooses a valid replacement. A successful board rename refreshes the menu's summarized artwork data while preserving the artwork id, progress, and live board state.

An imported artwork exposes its download action on the board and in its menu preview. The action stays disabled until the artwork is finished, matching Start over's stable placement and preventing completion from shifting the board header. On phones, the board action sits beside the overview instead of crowding the title and progress controls. Built-in artwork does not expose the action. The download is a PNG of the finished pixel artwork, not the original source image: importing has already reduced the source to the chosen grid and palette. Whole-pixel scaling brings the PNG's long side up to 1,024 pixels where possible, so small artwork remains crisp and useful outside Colorwork. The current artwork name supplies the file name.

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

## Achievements

An unlocked achievement arrives as a toast. It reports something that already happened and never needs an answer, so a dialog would be the wrong shape for it.

The card reads in one direction: a framed mark, the label, the achievement's name, then its description. The mark is the only badge-like surface in the interface. That is what separates an award from the ordinary confirmations that will share the same card.

Toasts sit top right at every viewport. Bottom placement covers the palette on phones, and the palette is a control the player has a hand on. The header it covers instead is text, and that text returns when the toast leaves. At desktop sizes the card stays inside the header band and never reaches the canvas, so a finished artwork is not covered by the message celebrating it.

The toast keeps one gesture. A sage hairline along the bottom edge runs out with the toast's own six seconds, so the card shows how long it will stay without carrying a close control. It pauses where Sonner pauses, when the pointer enters the stack, and holds still under reduced motion, where it reads as a plain accent rule. A drag dismisses it early. The duration is declared once in `showAchievementToast` and reaches CSS as `--achievement-toast-duration`, so the hairline and the timer cannot disagree.

## Responsive layout and accessibility

On phones, the tool rail is a horizontal scrolling strip above the board. From the `sm` breakpoint upward, it becomes a vertical rail beside the board. Overflowing panels need `min-w-0`; otherwise grid and flex sizing floors them at their min-content width and causes clipping instead of scrolling.

Controls retain accessible labels, pressed states, visible focus states, and touch-friendly target sizes across both layouts.
