import { createPuzzleProgress, UNPAINTED_PIXEL } from "./progress";
import type { PuzzleDefinition, PuzzleProgress } from "./types";

const STORAGE_PREFIX = "color-byte:progress:v1:";
const STORAGE_EVENT = "color-byte:progress-changed";
const STORAGE_VERSION = 1;

interface ProgressStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface StoredProgressV1 {
  paintedCells: string;
  puzzleSignature: string;
  version: 1;
}

export type SaveStatus = "error" | "idle" | "saved" | "saving";

interface ProgressSaveControllerOptions {
  onStatus: (status: SaveStatus) => void;
  puzzle: PuzzleDefinition;
  storage?: ProgressStorage;
}

const DEBOUNCE_DELAY = 750;
const MAXIMUM_SAVE_DELAY = 3000;
const SAVED_STATUS_DURATION = 1800;
const ERROR_STATUS_DURATION = 3000;

export function loadPuzzleProgress(puzzle: PuzzleDefinition, storage?: ProgressStorage) {
  const progressStorage = storage ?? getBrowserStorage();
  if (!progressStorage) {
    return;
  }

  try {
    const serialized = progressStorage.getItem(progressStorageKey(puzzle.id));
    if (!serialized) {
      return;
    }

    const record: unknown = JSON.parse(serialized);
    if (!isStoredProgress(record) || record.puzzleSignature !== createPuzzleSignature(puzzle)) {
      return;
    }

    return restoreProgress(puzzle, decodeBitset(record.paintedCells));
  } catch {
    // Corrupt or inaccessible progress behaves like an untouched puzzle.
  }
}

export function savePuzzleProgress(puzzle: PuzzleDefinition, progress: PuzzleProgress, storage?: ProgressStorage) {
  const progressStorage = storage ?? getBrowserStorage();
  if (!progressStorage) {
    return false;
  }

  try {
    const key = progressStorageKey(puzzle.id);
    const serialized = JSON.stringify({
      paintedCells: encodeBitset(progress),
      puzzleSignature: createPuzzleSignature(puzzle),
      version: STORAGE_VERSION,
    } satisfies StoredProgressV1);

    if (progressStorage.getItem(key) !== serialized) {
      progressStorage.setItem(key, serialized);
      notifyProgressChanged(key);
    }
    return true;
  } catch {
    return false;
  }
}

export function subscribeToStoredProgress(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key?.startsWith(STORAGE_PREFIX)) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

export function createProgressSaveController({ onStatus, puzzle, storage }: ProgressSaveControllerOptions) {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let maximumTimer: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let latestProgress: PuzzleProgress | undefined;
  let dirty = false;
  let savingDisabled = false;

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

  function clearStatusTimer() {
    if (statusTimer !== undefined) {
      clearTimeout(statusTimer);
      statusTimer = undefined;
    }
  }

  function showTemporaryStatus(status: "error" | "saved") {
    clearStatusTimer();
    onStatus(status);
    statusTimer = setTimeout(
      () => {
        statusTimer = undefined;
        onStatus("idle");
      },
      status === "saved" ? SAVED_STATUS_DURATION : ERROR_STATUS_DURATION
    );
  }

  function flush(announce: boolean) {
    clearSaveTimers();
    if (!(dirty && latestProgress) || savingDisabled) {
      return;
    }

    dirty = false;
    if (savePuzzleProgress(puzzle, latestProgress, storage)) {
      if (announce) {
        showTemporaryStatus("saved");
      }
      return;
    }

    savingDisabled = true;
    if (announce) {
      showTemporaryStatus("error");
    }
  }

  function schedule(progress: PuzzleProgress, immediate: boolean) {
    if (savingDisabled) {
      return;
    }

    latestProgress = progress;
    dirty = true;
    clearStatusTimer();
    onStatus("saving");

    if (immediate) {
      flush(true);
      return;
    }

    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => flush(true), DEBOUNCE_DELAY);
    maximumTimer ??= setTimeout(() => flush(true), MAXIMUM_SAVE_DELAY);
  }

  function connect() {
    if (typeof window === "undefined") {
      return () => flush(false);
    }

    function flushWhenHidden() {
      if (document.visibilityState === "hidden") {
        flush(true);
      }
    }

    function flushBeforeLeaving() {
      flush(false);
    }

    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushBeforeLeaving);

    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushBeforeLeaving);
      flush(false);
      clearStatusTimer();
    };
  }

  return { connect, flush, schedule };
}

function progressStorageKey(puzzleId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(puzzleId)}`;
}

function encodeBitset(progress: PuzzleProgress) {
  const bytes = new Uint8Array(Math.ceil(progress.paintedPixels.length / 8));

  for (let pixelIndex = 0; pixelIndex < progress.paintedPixels.length; pixelIndex += 1) {
    if (progress.paintedPixels[pixelIndex] !== UNPAINTED_PIXEL) {
      bytes[Math.floor(pixelIndex / 8)] += 2 ** (pixelIndex % 8);
    }
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBitset(encoded: string) {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

  return `${puzzle.width}x${puzzle.height}:${puzzle.palette.length}:${hash.toString(36)}`;
}

function isStoredProgress(value: unknown): value is StoredProgressV1 {
  if (!(value && typeof value === "object")) {
    return false;
  }

  const record = value as Partial<StoredProgressV1>;
  return (
    record.version === STORAGE_VERSION &&
    typeof record.paintedCells === "string" &&
    typeof record.puzzleSignature === "string"
  );
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    return window.localStorage;
  } catch {
    // Some privacy modes expose localStorage but throw when it is accessed.
  }
}

function notifyProgressChanged(key: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
  }
}
