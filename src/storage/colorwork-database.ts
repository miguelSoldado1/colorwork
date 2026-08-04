import { openDB } from "idb";
import type { DBSchema } from "idb";

const DATABASE_NAME = "colorwork";
const DATABASE_VERSION = 1;

export interface StoredArtworkV1 {
  createdAt: number;
  height: number;
  id: string;
  name: string;
  palette: string[];
  targetPixels: Uint8Array;
  updatedAt: number;
  version: 1;
  width: number;
}

export interface StoredProgressV1 {
  artworkId: string;
  paintedCells: Uint8Array;
  puzzleSignature: string;
  updatedAt: number;
  version: 1;
}

interface ColorworkDatabase extends DBSchema {
  artworks: {
    key: string;
    value: StoredArtworkV1;
  };
  progress: {
    key: string;
    value: StoredProgressV1;
  };
}

let databasePromise: ReturnType<typeof openDB<ColorworkDatabase>> | undefined;

export function getColorworkDatabase() {
  if (!databasePromise) {
    const pendingDatabase = openDB<ColorworkDatabase>(DATABASE_NAME, DATABASE_VERSION, {
      blocking() {
        // Let a newer deployment upgrade the schema instead of leaving it blocked by this tab.
        pendingDatabase.then(
          (database) => {
            database.close();
            resetDatabasePromise(pendingDatabase);
          },
          () => resetDatabasePromise(pendingDatabase)
        );
      },
      terminated() {
        // A browser-terminated connection cannot be reused, so allow the next operation to reopen it.
        resetDatabasePromise(pendingDatabase);
      },
      upgrade(database) {
        if (!database.objectStoreNames.contains("artworks")) {
          database.createObjectStore("artworks", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("progress")) {
          database.createObjectStore("progress", { keyPath: "artworkId" });
        }
      },
    });
    databasePromise = pendingDatabase;
    pendingDatabase.catch(() => {
      resetDatabasePromise(pendingDatabase);
    });
  }

  return databasePromise;
}

function resetDatabasePromise(pendingDatabase: ReturnType<typeof openDB<ColorworkDatabase>>) {
  if (databasePromise === pendingDatabase) {
    databasePromise = undefined;
  }
}
