import { describe, expect, it } from "vitest";
import { loadUserPreferences, saveUserPreferences } from "../../src/user-preferences";

class MemoryStorage {
  readonly values = new Map<string, string>();
  failReads: boolean;
  failWrites: boolean;
  writeAttempts = 0;

  constructor() {
    this.failReads = false;
    this.failWrites = false;
  }

  getItem(key: string) {
    if (this.failReads) {
      throw new DOMException("Storage is unavailable", "SecurityError");
    }
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.writeAttempts += 1;
    if (this.failWrites) {
      throw new DOMException("Storage is unavailable", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

describe("user preferences", () => {
  it("uses the board defaults when nothing has been stored", () => {
    expect(loadUserPreferences(new MemoryStorage())).toEqual({
      showGrid: true,
      showNumbers: false,
    });
  });

  it("round-trips grid and number visibility", () => {
    const storage = new MemoryStorage();
    const preferences = { showGrid: false, showNumbers: true };

    expect(saveUserPreferences(preferences, storage)).toBe(true);
    expect(loadUserPreferences(storage)).toEqual(preferences);
    expect([...storage.values.values()]).toEqual([JSON.stringify(preferences)]);
  });

  it("falls back to defaults for malformed records", () => {
    const storage = new MemoryStorage();
    storage.values.set("color-byte:preferences:v1", JSON.stringify({ showGrid: false }));

    expect(loadUserPreferences(storage)).toEqual({
      showGrid: true,
      showNumbers: false,
    });
  });

  it("handles inaccessible storage without breaking the board", () => {
    const storage = new MemoryStorage();
    storage.failReads = true;

    expect(loadUserPreferences(storage)).toEqual({
      showGrid: true,
      showNumbers: false,
    });

    storage.failReads = false;
    storage.failWrites = true;
    expect(saveUserPreferences({ showGrid: false, showNumbers: true }, storage)).toBe(false);
  });

  it("does not rewrite unchanged preferences", () => {
    const storage = new MemoryStorage();
    const preferences = { showGrid: false, showNumbers: true };

    saveUserPreferences(preferences, storage);
    saveUserPreferences(preferences, storage);

    expect(storage.writeAttempts).toBe(1);
  });
});
