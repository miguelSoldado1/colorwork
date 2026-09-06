# Colorwork

Colorwork is a browser-based pixel color-by-number game built with React, TypeScript, Vite, Tailwind CSS, and Canvas 2D. Choose one of the included artworks or import an image to turn it into a numbered coloring board.

## Getting started

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

Install the Playwright browser engines before running browser tests:

```sh
pnpm exec playwright install chromium firefox webkit
```

The artwork menu is available at `/`. Selecting an artwork opens its board at `/play/$levelId`.
Production builds also generate a static XML sitemap at `/sitemap.xml` and a matching `/robots.txt` from the built-in puzzle files. On Vercel, the sitemap uses `VERCEL_PROJECT_PRODUCTION_URL`; set `SITE_URL` when building outside Vercel.
Sitemap `lastmod` dates live in `scripts/vite/sitemap-plugin.ts`. Existing pages use the fixed `2026-09-06` baseline. Keep that baseline unchanged and add a `YYYY-MM-DD` override for each new or significantly updated page. When artwork is added or removed, also update the homepage (`/`) override. Pages without an override use the baseline; deployments and player progress do not change dates.
The static application shell contains the default search and social metadata. The social preview image is served from `/social-preview.png`. Built-in artwork routes set their own title, description, and canonical URL after the application loads.

Artwork definitions and progress are stored locally in IndexedDB; imported images are processed in this browser and never uploaded. There is no account or cloud sync, so clearing this browser's storage removes local progress and imported artwork. Imported artwork can be deleted from its preview in the menu.

## Analytics

In production, Colorwork sends product events to PostHog when a player opens artwork, starts or completes a puzzle, imports custom artwork, or resets progress. It also sends page-view and page-leave events. PostHog is disabled in development and when either environment variable is missing:

```dotenv
VITE_POSTHOG_PROJECT_TOKEN=phc_your_project_token
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

Product events do not include imported image data, filenames, imported artwork names, pixel data, color values, or per-cell events. Page events can include the URL and path, referring site, campaign parameters, browser, operating system, and device details. Configure PostHog for cookieless server-hash mode. Keep person profiles, autocapture, dead clicks, heatmaps, performance capture, session recording, surveys, and feature flags disabled.

## Playing

- Choose a numbered swatch, then use the pencil to paint matching cells. Incorrect colors are ignored.
- Drag the pencil to paint a continuous stroke.
- Use the bucket to fill a connected matching region inside the visible area.
- Use the pipette, or middle-click a cell, to select its target color.
- Use the zoom tools to zoom around the pointer and the hand tool to pan.
- Toggle the grid, cell numbers, or the highlight for missing cells from the tool rail.
- Click or drag the minimap to move around the board.

The menu also accepts PNG, JPG, and WebP images. The importer reduces the image to a configurable grid and palette before opening it as a new board.

## How it works

React owns the interface and summarized progress state. The coloring surface is an imperative Canvas controller that owns pixel rendering, camera state, pointer input, painting, and frame scheduling. Pixel data is stored in flat typed arrays rather than React state or individual DOM elements.

The main source areas are:

```text
src/
|-- coloring/    Canvas controller, image import, and progress logic
|-- components/  Interface grouped by feature
|-- levels/      Catalog, descriptions, previews, and imported levels
|-- puzzles/     Included artwork definitions
|-- query/       Artwork and progress queries
|-- routes/      Artwork menu and board routes
|-- storage/     IndexedDB schema and access
`-- styles/      Theme tokens and global styles
```

For the product and interaction rationale behind the implementation, see [Design notes](docs/design-notes.md). Coding agents and contributors should also follow [AGENTS.md](AGENTS.md).

## Development commands

```sh
pnpm dev           # Start the development server
pnpm test          # Run unit tests
pnpm test:watch    # Run unit tests in watch mode
pnpm test:browser  # Run Playwright tests (full Chromium + cross-browser smoke)
pnpm typecheck     # Check TypeScript
pnpm check         # Run repository checks
pnpm build         # Create a production build
pnpm preview       # Preview the production build
```

Run only the Firefox and WebKit smoke projects with:

```sh
pnpm test:browser --project=firefox-smoke --project=webkit-smoke
```

Run the desktop and mobile Safari/WebKit smoke projects with:

```sh
pnpm test:browser --project=webkit-smoke --project=webkit-mobile-smoke
```

Set `VITE_DEBUG=1` when starting the development server to show a development-only fill control. It can temporarily complete the current board and restore the preceding progress. Production builds never include the control.
