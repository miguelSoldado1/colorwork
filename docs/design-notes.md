# Colorwork design notes

These are the product and interaction decisions that are easy to lose when you only read the code. `AGENTS.md` has the short implementation rules. This file has the reasons behind them, and the versions we tried and dropped.

## Product shape

Colorwork has two main views, the artwork menu at `/` and the coloring board at `/play/$levelId`. An unknown artwork id redirects to the menu. It's a dead end, not an error the player can do anything about.

The interface is a near-colorless warm graphite so the artwork gets every saturated pixel. Muted sage is the only accent, and it's reserved for selection, progress and focus.

Text about completion uses painted and total cell counts, never a rounded percentage. On a large board `100%` can be on screen while cells are still unpainted. A meter can use a percentage, because it only shows a proportion.

## Artwork menu

The menu pairs a dense artwork table with `ArtworkPreviewPanel`. The table has the title and progress. The panel has the preview, grid size and palette. Neither side repeats what the other shows better.

Selection is client state and never touches the URL. The menu opens on the unfinished artwork the player last painted, built-in or imported, so someone coming back lands on "Keep painting" without hunting for the row. It has to be a stroke. Opening a board to look around doesn't count, or a quick peek at another piece would bump the one actually in progress. If that artwork has since been finished or deleted, the first catalog entry is selected instead. Something is always selected, so the preview column is never an empty hole and needs no empty state or close button. The remembered id lives in local storage and only decides where the menu starts. Picking a row changes the selection for that visit and leaves the id alone.

Each row has its own `Play →` link, in a column between the artwork and its pixel count. It's there because the menu is also the site's index. Nine rows of plain `Play` would give search engines and screen readers nine identical links, so each one carries its artwork's name in visually hidden text and reads as "Play Gobbo". Selecting and playing are separate jobs, so they're separate controls, siblings in the `li` rather than nested. The link is plain text with no background or border, since the preview panel already has the main painting action.

With the counts in the last column, they're no longer inside the row button. The button reaches across the row with a stretched overlay and the link sits above it, so pressing the counts still selects the artwork. Hovering the button tints the whole row and hovering the link doesn't, which is how you can tell the two targets apart. Both right-hand columns have fixed minimum widths. Each row is its own grid, so content-sized columns drift a few pixels from row to row and the links stop lining up with each other and with their caption.

The preview panel keeps its main painting action at every viewport size. On phones there's also a fixed action bar, as a shortcut while the player scrolls the list.

### Preview states

A preview has two states. A finished artwork shows in full color. An unfinished one shows in the same muted target tone as the minimap.

It never shows partial progress. Progress belongs to the text and meter next to it, and the image is there to show the artwork itself. Previews never show cell numbers, and cell size is floored to a whole pixel to keep them crisp.

The palette strip always shows the artwork's true colors with no progress state, because it describes what the piece contains. The board palette is different. There each swatch is a control, and it can dim when its color runs out.

"See full artwork" is the one deliberate way to see an unfinished artwork in color. The reveal stays inside the preview and resets when the selection changes, so one artwork's reveal can't leak into the next.

### Artist invitation

A strip near the bottom of the menu asks pixel artists to email us their work. It floats over the list, so it gets a close button. Closing it lasts until the page reloads. It stays closed after visiting a board, but nothing goes to storage.

The strip is built as one more row of the artwork list. It's as wide as the list, inset like the rows and about as tall as one. A dashed tile with the pencil sits where thumbnails go, borrowed from "Import your own", and the sentence starts where artwork names start. It reads as an empty slot in the collection, not a notice. Two earlier versions didn't work. A corner card sat on top of the table and cut through thumbnails and names, and a full-width strip looked like a cookie banner.

It's sticky, not fixed, so at the end of the page it settles under the footer instead of covering it. On phones it sits above the artwork action bar, drops the tile so the sentence gets the width, and puts the email link and close button on their own line.

The close button keeps a 44-pixel target, but only a 28-pixel square around the glyph reacts to hover, press and focus. Tinting the whole target looked oversized in a strip this slim.

The copy is one sentence that opens with a bold "Pixel artist?". A separate title made the phone version wordy. The strip promises credit and a link back and nothing else. Payment and permission belong in the email, where "this is unpaid" is part of an agreement instead of a disclaimer on the menu. The email link opens a draft that asks for the name and link to credit, then lists what the artist confirms by sending. They keep ownership. Colorwork gets non-exclusive use, may adapt the piece into a puzzle, and may show it in posts about the game. The contribution is unpaid, and the artist can ask for removal at any time.

Clicking the email link and closing the strip each send a product event with no properties. The strip arrives a moment after the menu with one short rise, uses the toast's card surface, and has no accent.

## Importing artwork

Import starts from the menu, because the board is for painting one artwork. The image becomes a puzzle, is stored in IndexedDB, appears after the built-in catalog, and opens through the normal board route. Its definition and progress survive reloads. Menu components get stored progress through `describeLevel` and never read storage or pixel arrays directly.

### Cropping

Cropping is optional. The normal path shows the processed puzzle first, and "Adjust crop" opens the editor only when the player wants it.

Entering crop mode moves nothing. The dialog holds one fixed size, with a pinned header and footer over a scrolling body, so palette wrapping, an error or a mode change can't resize it or shift it around the viewport. The artwork box keeps its size and top-left corner in both modes. Cropping widens it across the settings column and gathers its controls into a bar underneath, so the stage grows from where it already was instead of the whole panel resizing. On wider screens the body is clipped and the settings column scrolls on its own, so the box takes its height from the dialog and not from however much the settings contain. The dialog is wide enough for that column to be landscape, because imported artwork usually is.

The crop action sits under the artwork as a quiet inline control, not a block, since it adjusts what the box above it shows. Its slot is the same height as the crop bar that replaces it. The footer holds the current mode's actions, so there's only ever one primary action and one Cancel on screen. Apply goes back to the processed preview. Cancel or Escape throws away the staged change and returns focus to the crop control. Reset recenters the image at its fitted scale, and that's how you undo an applied crop. Changing the grid after a crop keeps its normalized center and zoom, then fits that selection to the new grid ratio.

The frame uses the current grid's aspect ratio and the image moves behind it. Drag to position, scroll the wheel to zoom toward the pointer, nudge with the arrow keys, step zoom with `+` and `-`, or use the single slider. The grid size Apply will produce shows as a quiet caption under the preview. The zoom controls stay on one compact line so the changing caption doesn't crowd them.

Everything outside the frame sinks into the stage. The rest of the image stays readable as context but doesn't compete with the selection. The frame has a hairline edge and registration marks that extend its edges into the masked margin, so nothing tinted sits on the artwork itself. Inside the frame, a lattice shows the cells the grid will sample, which ties cropping to grid size. Below a certain spacing the lattice turns into a grey wash, so it's dropped there.

### Names and downloads

Imported names are trimmed, fall back to "Custom puzzle" when empty, and are capped at 60 characters. Names taken from filenames are cut to fit before import. Older stored names over the limit stay as they are until the player picks a valid replacement.

An imported artwork has a download action on the board and in its menu preview. It stays disabled until the artwork is finished. That's the same fixed placement Start over uses, and it keeps completion from shifting the board header. On phones the board's download button sits beside the overview instead of crowding the title and progress. Built-in artwork has no download. The file is a PNG of the finished pixel artwork, not the source image, since importing already reduced the source to the chosen grid and palette. Whole-pixel scaling brings the long side up to 1,024 pixels where possible, so small artwork stays crisp outside Colorwork. The file is named after the artwork.

## Coloring board

The Canvas controller owns rendering, the camera, input, painting, progress and render scheduling. React wraps it with tools, palette, progress and save status, and only gets summarized updates. That boundary is what keeps a large board from turning into a React update or DOM node per pixel.

An unpainted board isn't blank. It shows the minimap's grayscale target at low opacity, with a translucent wash over cells of the selected color. The guide fades as the board fills, or the last few unpainted cells would hide among their finished neighbors. The minimap starts from the same muted target and overlays painted cells in their true colors. Both use `mutedTargetGray` so the tone curve matches.

Numbers are off by default because they make a full board noisy. Once turned on, they show at every zoom level, because a visible control shouldn't silently stop working. Their scale floors to a whole pixel, never below 1, so unsmoothed rendering stays crisp. Numbers and the selected-color highlight are separate toggles.

Pencil strokes stop at the Canvas edge and never bridge a gap while the pointer is outside. Bucket fill only reaches cells inside the visible rectangle captured when the fill starts. Zoom steps are fixed and centered on the cursor, and panning is its own tool. Middle-click picks a cell's target color without painting or switching tools.

### Starting over

"Start over" clears stored progress through `clearPuzzleProgress` and is disabled on an untouched board. It's in the menu preview and in the board header, so resetting never means leaving the artwork. The board drops pending autosaves before removing the stored record, then rebuilds its live progress from empty. Neither control opens a modal. The artwork around it already shows what will be cleared, and a modal would cover that up and say it again.

The menu and board have different visual languages, so the control is written twice on one shared confirm flow instead of one component reskinned through props. `useConfirmAction` owns the pending state, the focus handoff and Escape. Each control owns its layout and wording.

The menu labels its buttons, so `StartOverControl` is a labelled button whose two states cross-fade in one grid cell, under a hairline rule that separates it from the main actions. The board is all icons with tooltips, so `StartOverPopover` is a muted icon in the header's action group, left of the hairline. The progress meter stays the rightmost thing in the header. The confirmation is an anchored panel that scales from the control's top corner and sits directly under it. It crosses the header rule on the way down. Looking attached to the control mattered more than an unbroken hairline, and a bigger offset made the panel look like it grew out of the header. Pressing elsewhere dismisses it and leaves focus where the player pressed. Moving keyboard focus outside dismisses it too. Escape dismisses it and returns focus to the control. Once clearing starts, the confirmation stays until it succeeds or fails.

Clearing progress is also the only way to repaint a finished artwork. Opening a finished piece restores its completed board, which is why the primary action says "Open the finished board."

### Renaming imported artwork

The board keeps the destructive control out of the title row, and the row has no action buttons of its own. An imported artwork is renamed by editing its title in place. The name is the control, marked only by a hairline under it that brightens on hover. A hidden description names the action for assistive technology, without a redundant tooltip. We tried a pencil button first and dropped it. It repeated the glyph the pencil tool already uses in the rail, and on a phone its touch target truncated the very name it was there to edit.

The field that replaces the title inherits its size, weight and left edge, so the name doesn't move when editing starts. Only the actions arrive. It's sized by its own text rather than by the row, with a 12rem floor from `sm` up so short names still get a clear editing surface. A 60-character name is never given a narrower box to edit than it had to read. Browsers without content-sized fields fall back to a full-row field, which is what phones always get anyway. Below `lg` the header's secondary actions hide while editing, because the form and the board actions don't fit in one row there, and the name is what the player came to change. Phones also swap the labelled Save and Cancel for 48-pixel icon buttons.

The title line reserves 24 pixels, the height of the name, at every viewport. The rename controls are taller and hang over into the header's bottom padding instead of growing the row, so both title states are the same height and the board never moves. Twenty-four is the floor because it's the smallest line that keeps a 48-pixel control off the header rule. An earlier version reserved 48 for a phone rename button that no longer exists, and left the field floating in dead space. From `sm` up, 40-pixel Save and Cancel buttons with text labels center over the line without adding to the header's height.

A failed save keeps the form open and answers in place. The hairline turns red, the name gives a short damped shake, and the reason shows in an anchored card that doesn't push anything. Reduced motion gets the red hairline without the shake. Saving disables the field, so after a failure focus goes back to the name instead of falling to the document. Enter saves. Escape, Cancel or leaving the control cancels. Renaming never changes the artwork id or rebuilds live Canvas state, and the menu refreshes its summary with the id, progress and board state untouched.

## Palette and completion

Painting the last missing cell of the selected color moves selection, after a 250 ms pause, to the next unfinished color in palette order, wrapping around. It reuses the selection indicator and doesn't move the camera or reorder swatches. Picking any swatch by hand cancels the pending move, even the same swatch again. Opening saved progress selects the first unfinished color right away. Finishing the artwork keeps the last color selected and celebrates immediately.

A used-up swatch dims so the player can find the colors that are left. When every color is used up, none of them dim. A fully gray palette would make the finished artwork feel drained without pointing anywhere useful.

Completion is the one deliberately colorful moment in the interface. Every particle takes a color from the artwork's palette, so the effect belongs to that artwork and there's no fixed celebration color. Particles start at the board edge and fly outward, so the finished artwork stays uncovered.

The particle geometry lives in the `CONFETTI` constant, and CSS reads it through `--fly-*` custom properties. A shrink-wrapping element gives the effect the board's bounds without measuring anything at runtime. Keep transforms off that wrapper chain, because they blur particles that should sit on whole pixels.

## Achievements

"First import" is earned when the first imported picture is saved. Existing collections get it when achievements are reconciled. Like every other award, it stays earned after the artwork is deleted.

### The toast

A new achievement arrives as a toast. It reports something that already happened and never needs an answer, so a dialog would be the wrong shape. The whole card links to that achievement on the achievements page. Once the history loads, the card there scrolls into view and takes focus, and a brief sage border marks it. Under reduced motion the highlight holds still before it clears. The menu links to the achievements page from its footer, next to Privacy, so the toast is a shortcut to a trip the player could already make.

The menu header was the obvious home for that link, and it didn't work. We built and looked at four placements. Each one put a second thing in a header whose only job is to name the collection, and the link kept reading as a notice competing with the table under it. The footer costs real discoverability, since it's below the whole table. That's the trade, and it's why the toast is worth having. Both footer links get a 44-pixel target from a negative margin, so adding one didn't change the footer's height.

The card reads left to right: a framed mark, the label, the achievement's name, its description, then an arrow at the right edge pointing at the destination. The mark is the only badge-like surface in the interface, and it's what separates an award from the ordinary confirmations that will share this card. The arrow is 12px, exactly half of the icon set's 24px grid. A pixel glyph at a fractional scale goes soft, and at 13px this one did.

Toasts sit top right at every viewport. At the bottom they'd cover the palette on phones, and the player's hand is on the palette. The header is just text, and it comes back when the toast leaves. One card stays inside the header band and never reaches the canvas, so a finished artwork isn't covered by the message celebrating it. The stack stays expanded. A collapsed stack fans out under the pointer and shifts while you're reading it, which is worse than the space it saves. The cost is that two cards at once do reach the canvas.

The toast has one bit of motion. A sage hairline along the bottom edge runs down over the toast's six seconds, so the card shows how long it'll stay without needing a close button. It pauses when Sonner pauses, while the pointer is over the stack, and holds still under reduced motion, where it reads as a plain accent rule. Dragging dismisses the toast early. A swipe ends in a click, so any press that travels more than eight pixels cancels the navigation. The duration is set once in `showAchievementToast` and reaches CSS as `--achievement-toast-duration`, so the hairline and the timer can't disagree.

### The achievements page

One card per achievement. The toast is already a card, and the page is that card standing still. Cards run one per row at every width, and the page never turns into a grid of tiles. A card that wide has to use its width. From `sm` up the unlock date moves to the far edge, with the name at one end, the date at the other and the description underneath. Phones don't have room for that, so the date sits under the name.

Cards stay in catalog order. Grouping earned and unearned was built first and dropped. It moves a card the moment it's won, right after a toast has told the player where that card is. A card should stay where it was last seen and just change state.

Each card has the toast's framed mark, filled with sage once the award is earned and hollow until then. The mark belongs to the achievement, and the toast borrows it. Locked cards sit a tone lower with a muted name. That, the hollow mark and the missing date are the whole difference. Nothing goes on top: no badge, no ribbon, no lock icon.

The unlock date takes the place of the toast's "Achievement unlocked" label, in the same sage micro-caps, so an earned card reads the way its announcement did. A locked card has nothing to put there and prints nothing, which leaves the dates as the only thing running down the right edge. On phones a locked card's title block reserves the same space for the date as an earned one, so cards don't move while history loads or when something unlocks.

Every card gets a meter. We tried dropping it from the single-step achievements and put it back. A finished achievement showing a full sage bar is the point, and a card without a bar looks like a mistake, not like a card with nothing to measure. The label next to the bar stays muted at every value. Locked achievements describe what's left, like "2 more artworks" or "7 more imports". Earned ones keep their completed count. An earned card keeps a full meter even if the collection later shrinks. It already spends sage on its mark, its date and its full bar, and sage is the only accent there is.

The header is type and nothing else. The cards below have the marks, and a fifth framed mark above them would only water them down. A strip of cells restating the count went too, since the meters already show that count four times.

The summary holds its place through loading and failure, and the page never rebuilds itself while someone is reading. Achievement names and descriptions show right away while the stored history loads. Only the summary count and progress details use placeholders, and the cards reserve the size they'll have once history arrives. A failed read has no honest count to show. The heading falls back to the page's own name, the sage eyebrow above it goes away with the count it labelled, and the error says what couldn't be opened and that artwork and progress are untouched.

## Analytics

Analytics only run in production. Achievement events record newly saved unlocks by their authored award ids. They never include imported artwork names or ids.

A puzzle sends one event each time painting crosses 25, 50 and 75 percent, between the start and completion events. Counting crossings shows where players stop without watching the page lifecycle, and every event goes out while the player is still painting. Starting over lets the milestones fire again.

## Responsive layout and accessibility

On phones the tool rail is a horizontal scrolling strip above the board. From `sm` up it's a vertical rail beside the board. Overflowing panels need `min-w-0`, or grid and flex sizing holds them at their min-content width and they clip instead of scrolling.

Controls keep accessible labels, pressed states, visible focus and touch-friendly targets in both layouts.
