import { getColorworkDatabase } from "../storage/colorwork-database";
import { createPuzzleProgress, UNPAINTED_PIXEL } from "./progress";
import type { StoredProgressV1 } from "../storage/colorwork-database";
import type { PuzzleDefinition, PuzzleProgress } from "./types";

const STORAGE_EVENT = "colorwork:progress-changed";
const STORAGE_CHANNEL = "colorwork:progress";
const STORAGE_VERSION = 1;

let progressChannel: BroadcastChannel | null | undefined;
const puzzleSignatures = new WeakMap<PuzzleDefinition, string>();

export interface ProgressRepository {
  delete: (artworkId: string) => Promise<void>;
  get: (artworkId: string) => Promise<StoredProgressV1 | undefined>;
  put: (record: StoredProgressV1) => Promise<void>;
}

export type ProgressSaveStatus = "error" | "idle" | "saved" | "saving";

interface ProgressSaveControllerOptions {
  onStatus: (status: ProgressSaveStatus) => void;
  puzzle: PuzzleDefinition;
  repository?: ProgressRepository;
}

const indexedDbProgressRepository: ProgressRepository = {
  async delete(artworkId) {
    const database = await getColorworkDatabase();
    await database.delete("progress", artworkId);
  },
  async get(artworkId) {
    const database = await getColorworkDatabase();
    return database.get("progress", artworkId);
  },
  async put(record) {
    const database = await getColorworkDatabase();
    await database.put("progress", record);
  },
};

const DEBOUNCE_DELAY = 750;
const MAXIMUM_SAVE_DELAY = 3000;
const SAVED_STATUS_DURATION = 1800;
const FAILURE_NOTICE_DELAY = 10_000;
const RETRY_DELAYS = [500, 1000, 2000, 4000, 5000] as const;

export async function loadPuzzleProgress(
  puzzle: PuzzleDefinition,
  repository: ProgressRepository = indexedDbProgressRepository
) {
  const record = await repository.get(puzzle.id);
  if (!(record && isStoredProgress(record)) || record.puzzleSignature !== createPuzzleSignature(puzzle)) {
    return;
  }

  try {
    return restoreProgress(puzzle, record.paintedCells);
  } catch {
    // A malformed record behaves like an untouched puzzle; later saves replace it.
  }
}

export async function savePuzzleProgress(
  puzzle: PuzzleDefinition,
  progress: PuzzleProgress,
  repository: ProgressRepository = indexedDbProgressRepository
) {
  await repository.put({
    artworkId: puzzle.id,
    paintedCells: encodeBitset(progress),
    puzzleSignature: createPuzzleSignature(puzzle),
    updatedAt: Date.now(),
    version: STORAGE_VERSION,
  });
  notifyProgressChanged(puzzle.id);
}

export async function clearPuzzleProgress(
  puzzle: PuzzleDefinition,
  repository: ProgressRepository = indexedDbProgressRepository
) {
  await repository.delete(puzzle.id);
  notifyProgressChanged(puzzle.id);
}

export function subscribeToStoredProgress(onChange: (artworkId: string) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleLocalChange(event: Event) {
    const artworkId = (event as CustomEvent<unknown>).detail;
    if (typeof artworkId === "string") {
      onChange(artworkId);
    }
  }

  window.addEventListener(STORAGE_EVENT, handleLocalChange);

  const channel = getProgressChannel();
  if (channel) {
    const handleBroadcastChange = (event: MessageEvent<unknown>) => {
      if (typeof event.data === "string") {
        onChange(event.data);
      }
    };
    channel.addEventListener("message", handleBroadcastChange);

    return () => {
      window.removeEventListener(STORAGE_EVENT, handleLocalChange);
      channel.removeEventListener("message", handleBroadcastChange);
    };
  }

  return () => {
    window.removeEventListener(STORAGE_EVENT, handleLocalChange);
  };
}

export function createProgressSaveController({
  onStatus,
  puzzle,
  repository = indexedDbProgressRepository,
}: ProgressSaveControllerOptions) {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let maximumTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let latestProgress: PuzzleProgress | undefined;
  let latestRevision = 0;
  let savedRevision = 0;
  let retryAttempt = 0;
  let failureStartedAt: number | undefined;
  let writePromise: Promise<void> | undefined;
  let errorVisible = false;
  let retryEnabled = true;
  let statusEnabled = true;

  function reportStatus(status: ProgressSaveStatus) {
    if (statusEnabled) {
      onStatus(status);
    }
  }

  function clearSaveTimers() {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    if (maximumTimer !== undefined) {
      clearTimeout(maximumTimer);
      maximumTimer = undefined;
    }
  }

  function clearRetryTimer() {
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  }

  function clearStatusTimer() {
    if (statusTimer !== undefined) {
      clearTimeout(statusTimer);
      statusTimer = undefined;
    }
  }

  function showSavedStatus() {
    clearStatusTimer();
    errorVisible = false;
    reportStatus("saved");
    statusTimer = setTimeout(() => {
      statusTimer = undefined;
      reportStatus("idle");
    }, SAVED_STATUS_DURATION);
  }

  function scheduleRetry() {
    if (!retryEnabled) {
      return;
    }

    clearRetryTimer();
    const delay = RETRY_DELAYS[Math.min(retryAttempt - 1, RETRY_DELAYS.length - 1)];
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      startFlush(true);
    }, delay);
  }

  async function flush(announce: boolean, retryOnFailure = true): Promise<void> {
    clearSaveTimers();
    if (!(latestProgress && latestRevision > savedRevision)) {
      await writePromise;
      return;
    }
    if (writePromise) {
      await writePromise;
      return;
    }

    clearRetryTimer();
    const progress = latestProgress;
    const savingRevision = latestRevision;
    let saved = false;

    writePromise = savePuzzleProgress(puzzle, progress, repository)
      .then(() => {
        saved = true;
        savedRevision = savingRevision;
        retryAttempt = 0;
        failureStartedAt = undefined;
        if (latestRevision === savedRevision && announce) {
          showSavedStatus();
        }
      })
      .catch(() => {
        failureStartedAt ??= Date.now();
        retryAttempt += 1;
        if (announce && Date.now() - failureStartedAt >= FAILURE_NOTICE_DELAY) {
          clearStatusTimer();
          errorVisible = true;
          reportStatus("error");
        }
        if (retryOnFailure) {
          scheduleRetry();
        }
      })
      .finally(() => {
        writePromise = undefined;
      });

    await writePromise;
    if (saved && latestRevision > savedRevision) {
      await flush(announce, retryOnFailure);
    }
  }

  function startFlush(announce: boolean, retryOnFailure = true) {
    flush(announce, retryOnFailure).catch(() => undefined);
  }

  function schedule(progress: PuzzleProgress, immediate: boolean) {
    latestProgress = progress;
    latestRevision += 1;
    clearStatusTimer();
    if (!errorVisible) {
      reportStatus("saving");
    }

    if (immediate) {
      startFlush(true);
      return;
    }

    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => startFlush(true), DEBOUNCE_DELAY);
    maximumTimer ??= setTimeout(() => startFlush(true), MAXIMUM_SAVE_DELAY);
  }

  function dropPendingWork() {
    clearSaveTimers();
    clearRetryTimer();
    clearStatusTimer();
    latestProgress = undefined;
    // Advancing past `savedRevision` also keeps an in-flight write from announcing "saved" afterwards.
    latestRevision += 1;
    retryAttempt = 0;
    failureStartedAt = undefined;
    errorVisible = false;
  }

  async function discard() {
    dropPendingWork();

    // A write already in IndexedDB cannot be cancelled, and a failing one arms a retry as it settles.
    while (writePromise) {
      // biome-ignore lint/performance/noAwaitInLoops: The write queue is serialized by design.
      await writePromise;
      dropPendingWork();
    }

    reportStatus("idle");
  }

  function connect() {
    retryEnabled = true;
    statusEnabled = true;
    if (typeof window === "undefined") {
      return () => startFlush(false, false);
    }

    function flushWhenHidden() {
      if (document.visibilityState === "hidden") {
        startFlush(true);
      }
    }

    function flushBeforeLeaving() {
      startFlush(false, false);
    }

    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushBeforeLeaving);

    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushBeforeLeaving);
      retryEnabled = false;
      statusEnabled = false;
      clearRetryTimer();
      clearStatusTimer();
      startFlush(false, false);
    };
  }

  return { connect, discard, flush, schedule };
}

function encodeBitset(progress: PuzzleProgress) {
  const bytes = new Uint8Array(Math.ceil(progress.paintedPixels.length / 8));

  for (let pixelIndex = 0; pixelIndex < progress.paintedPixels.length; pixelIndex += 1) {
    if (progress.paintedPixels[pixelIndex] !== UNPAINTED_PIXEL) {
      bytes[Math.floor(pixelIndex / 8)] += 2 ** (pixelIndex % 8);
    }
  }

  return bytes;
}

function restoreProgress(puzzle: PuzzleDefinition, bitset: Uint8Array) {
  const expectedLength = Math.ceil((puzzle.width * puzzle.height) / 8);
  if (bitset.length !== expectedLength) {
    throw new RangeError("Stored progress has the wrong cell count.");
  }

  const progress = createPuzzleProgress(puzzle);
  for (let pixelIndex = 0; pixelIndex < progress.paintedPixels.length; pixelIndex += 1) {
    const byte = bitset[Math.floor(pixelIndex / 8)];
    const painted = Math.floor(byte / 2 ** (pixelIndex % 8)) % 2 === 1;
    if (!painted) {
      continue;
    }

    const colorIndex = puzzle.targetPixels[pixelIndex];
    progress.paintedPixels[pixelIndex] = colorIndex;
    progress.paintedByColor[colorIndex] += 1;
    progress.paintedCount += 1;
  }
  return progress;
}

function createPuzzleSignature(puzzle: PuzzleDefinition) {
  const cached = puzzleSignatures.get(puzzle);
  if (cached) {
    return cached;
  }

  const HASH_MODULUS = 4_294_967_291;
  let hash = 17;

  function mix(value: number) {
    hash = (hash * 31 + value) % HASH_MODULUS;
  }

  mix(puzzle.width);
  mix(puzzle.height);
  for (const color of puzzle.palette) {
    for (let index = 0; index < color.length; index += 1) {
      mix(color.charCodeAt(index));
    }
    mix(0);
  }
  for (const colorIndex of puzzle.targetPixels) {
    mix(colorIndex);
  }

  const signature = `${puzzle.width}x${puzzle.height}:${puzzle.palette.length}:${hash.toString(36)}`;
  puzzleSignatures.set(puzzle, signature);
  return signature;
}

function isStoredProgress(value: unknown): value is StoredProgressV1 {
  if (!(value && typeof value === "object")) {
    return false;
  }

  const record = value as Partial<StoredProgressV1>;
  return (
    record.version === STORAGE_VERSION &&
    typeof record.artworkId === "string" &&
    record.paintedCells instanceof Uint8Array &&
    typeof record.puzzleSignature === "string" &&
    typeof record.updatedAt === "number"
  );
}

function notifyProgressChanged(artworkId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: artworkId }));
  const channel = getProgressChannel();
  if (channel) {
    // The shared channel does not receive its own message, avoiding a second same-tab notification.
    try {
      channel.postMessage(artworkId);
    } catch {
      // Cross-tab synchronization is best effort; the local notification already succeeded.
    }
  }
}

function getProgressChannel() {
  if (progressChannel !== undefined) {
    return progressChannel ?? undefined;
  }

  if (typeof BroadcastChannel === "undefined") {
    progressChannel = null;
    return;
  }

  try {
    progressChannel = new BroadcastChannel(STORAGE_CHANNEL);
    return progressChannel;
  } catch {
    // Some restricted browser contexts expose BroadcastChannel but do not allow it to open.
    progressChannel = null;
  }
}
