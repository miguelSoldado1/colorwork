import type { PostHog } from "posthog-js/dist/module.no-external";
import type { PuzzleDefinition } from "@/coloring/types";
import type { LevelSource } from "@/levels/describe-level";

type AnalyticsEvent =
  | "achievement_unlocked"
  | "artist_invitation_dismissed"
  | "artist_invitation_email_clicked"
  | "artwork_opened"
  | "custom_artwork_imported"
  | "puzzle_completed"
  | "puzzle_milestone_reached"
  | "puzzle_reset"
  | "puzzle_started";

export type ResetSurface = "board" | "menu";

const PROGRESS_MILESTONES = [25, 50, 75];

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
        capture_pageleave: true,
        capture_pageview: "history_change",
        capture_performance: false,
        cookieless_mode: "always",
        defaults: "2026-05-30",
        disable_session_recording: true,
        disable_surveys: true,
        person_profiles: "never",
        rageclick: false,
        save_campaign_params: true,
        save_referrer: true,
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

interface ArtworkOpened {
  paintedCells: number;
  puzzle: PuzzleDefinition;
  source: LevelSource;
  totalCells: number;
}

export function trackArtworkOpened(props: ArtworkOpened) {
  capture("artwork_opened", {
    ...getArtworkAnalyticsProperties(props.puzzle, props.source),
    painted_cells: props.paintedCells,
    progress_state: getProgressState(props.paintedCells, props.totalCells),
    total_cells: props.totalCells,
  });
}

export function trackArtistInvitation(action: "dismissed" | "email_clicked") {
  capture(`artist_invitation_${action}`, {});
}

interface CustomArtworkImported {
  puzzle: PuzzleDefinition;
  sourceHeight: number;
  sourceWidth: number;
}

export function trackCustomArtworkImported(props: CustomArtworkImported) {
  capture("custom_artwork_imported", {
    cell_count: props.puzzle.width * props.puzzle.height,
    grid_height: props.puzzle.height,
    grid_width: props.puzzle.width,
    palette_size: props.puzzle.palette.length,
    source_height: props.sourceHeight,
    source_width: props.sourceWidth,
  });
}

interface PuzzleStarted {
  paintedCells: number;
  puzzle: PuzzleDefinition;
  source: LevelSource;
}

export function trackPuzzleStarted(props: PuzzleStarted) {
  capture("puzzle_started", {
    ...getArtworkAnalyticsProperties(props.puzzle, props.source),
    painted_cells: props.paintedCells,
  });
}

interface ProgressMilestoneUpdate {
  paintedCells: number;
  previousPaintedCells: number;
  puzzle: PuzzleDefinition;
  source: LevelSource;
  totalCells: number;
}

export function trackProgressMilestones(props: ProgressMilestoneUpdate) {
  for (const milestone of PROGRESS_MILESTONES) {
    const milestoneCells = props.totalCells * milestone;

    if (props.previousPaintedCells * 100 < milestoneCells && props.paintedCells * 100 >= milestoneCells) {
      capture("puzzle_milestone_reached", {
        ...getArtworkAnalyticsProperties(props.puzzle, props.source),
        milestone_percent: milestone,
      });
    }
  }
}

export function trackPuzzleCompleted(puzzle: PuzzleDefinition, source: LevelSource) {
  capture("puzzle_completed", {
    ...getArtworkAnalyticsProperties(puzzle, source),
  });
}

interface PuzzleReset {
  paintedCellsBeforeReset: number;
  puzzle: PuzzleDefinition;
  source: LevelSource;
  surface: ResetSurface;
}

export function trackPuzzleReset(props: PuzzleReset) {
  capture("puzzle_reset", {
    ...getArtworkAnalyticsProperties(props.puzzle, props.source),
    painted_cells_before_reset: props.paintedCellsBeforeReset,
    reset_surface: props.surface,
  });
}

export function trackAchievementUnlocked(achievementId: string) {
  capture("achievement_unlocked", { achievement_id: achievementId });
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
