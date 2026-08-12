import type { PostHog } from "posthog-js/dist/module.no-external";
import type { PuzzleDefinition } from "@/coloring/types";
import type { LevelSource } from "@/levels/describe-level";

type AnalyticsEvent =
  | "artwork_opened"
  | "custom_artwork_imported"
  | "puzzle_completed"
  | "puzzle_reset"
  | "puzzle_started";

export type ResetSurface = "board" | "menu";

type EventProperties = Record<string, boolean | number | string>;

const projectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const apiHost = import.meta.env.VITE_POSTHOG_HOST?.trim();

let clientPromise: Promise<PostHog | null> | undefined;

function getClient(): Promise<PostHog | null> {
  if (!(import.meta.env.PROD && projectToken && apiHost)) {
    return Promise.resolve(null);
  }
  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = import("posthog-js/dist/module.no-external")
    .then(({ default: posthog }) => {
      posthog.init(projectToken, {
        advanced_disable_feature_flags: true,
        advanced_disable_feature_flags_on_first_load: true,
        advanced_disable_flags: true,
        api_host: apiHost,
        autocapture: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_pageleave: false,
        capture_pageview: false,
        capture_performance: false,
        cookieless_mode: "always",
        defaults: "2026-05-30",
        disable_session_recording: true,
        disable_surveys: true,
        person_profiles: "never",
        property_denylist: [
          "$current_url",
          "$pathname",
          "$referrer",
          "$referring_domain",
          "$session_entry_pathname",
          "$session_entry_url",
        ],
        rageclick: false,
        save_campaign_params: false,
        save_referrer: false,
      });

      return posthog;
    })
    .catch(() => null);

  return clientPromise;
}

export function initializeAnalytics() {
  getClient().catch(() => undefined);
}

export function getArtworkAnalyticsProperties(puzzle: PuzzleDefinition, source: LevelSource): EventProperties {
  const properties: EventProperties = {
    artwork_source: source,
    cell_count: puzzle.width * puzzle.height,
    grid_height: puzzle.height,
    grid_width: puzzle.width,
    palette_size: puzzle.palette.length,
  };

  // Imported names and IDs can contain user-provided filenames or puzzle names. Built-in IDs are authored catalog
  // metadata, so they are safe and useful for comparing artwork popularity.
  if (source === "catalog") {
    properties.artwork_id = puzzle.id;
  }

  return properties;
}

export function trackArtworkOpened(
  puzzle: PuzzleDefinition,
  source: LevelSource,
  paintedCells: number,
  totalCells: number
) {
  capture("artwork_opened", {
    ...getArtworkAnalyticsProperties(puzzle, source),
    painted_cells: paintedCells,
    progress_state: getProgressState(paintedCells, totalCells),
    total_cells: totalCells,
  });
}

export function trackCustomArtworkImported(puzzle: PuzzleDefinition, sourceWidth: number, sourceHeight: number) {
  capture("custom_artwork_imported", {
    cell_count: puzzle.width * puzzle.height,
    grid_height: puzzle.height,
    grid_width: puzzle.width,
    palette_size: puzzle.palette.length,
    source_height: sourceHeight,
    source_width: sourceWidth,
  });
}

export function trackPuzzleStarted(puzzle: PuzzleDefinition, source: LevelSource, paintedCells: number) {
  capture("puzzle_started", {
    ...getArtworkAnalyticsProperties(puzzle, source),
    painted_cells: paintedCells,
  });
}

export function trackPuzzleCompleted(puzzle: PuzzleDefinition, source: LevelSource) {
  capture("puzzle_completed", {
    ...getArtworkAnalyticsProperties(puzzle, source),
  });
}

export function trackPuzzleReset(
  puzzle: PuzzleDefinition,
  source: LevelSource,
  paintedCells: number,
  surface: ResetSurface
) {
  capture("puzzle_reset", {
    ...getArtworkAnalyticsProperties(puzzle, source),
    painted_cells_before_reset: paintedCells,
    reset_surface: surface,
  });
}

function capture(event: AnalyticsEvent, properties: EventProperties) {
  getClient()
    .then((client) => {
      client?.capture(event, properties);
    })
    .catch(() => undefined);
}

function getProgressState(paintedCells: number, totalCells: number) {
  if (paintedCells <= 0) {
    return "fresh";
  }
  if (paintedCells >= totalCells) {
    return "complete";
  }
  return "in_progress";
}
