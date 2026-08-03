const STORAGE_KEY = "color-byte:preferences:v1";

export interface UserPreferences {
  showGrid: boolean;
  showNumbers: boolean;
}

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showGrid: true,
  showNumbers: false,
};

interface PreferencesStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function loadUserPreferences(storage?: PreferencesStorage): UserPreferences {
  const preferencesStorage = storage ?? getBrowserStorage();
  if (!preferencesStorage) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  try {
    const serialized = preferencesStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return { ...DEFAULT_USER_PREFERENCES };
    }

    const record: unknown = JSON.parse(serialized);
    if (!isStoredUserPreferences(record)) {
      return { ...DEFAULT_USER_PREFERENCES };
    }

    return {
      showGrid: record.showGrid,
      showNumbers: record.showNumbers,
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(preferences: UserPreferences, storage?: PreferencesStorage) {
  const preferencesStorage = storage ?? getBrowserStorage();
  if (!preferencesStorage) {
    return false;
  }

  try {
    const serialized = JSON.stringify(preferences);

    if (preferencesStorage.getItem(STORAGE_KEY) !== serialized) {
      preferencesStorage.setItem(STORAGE_KEY, serialized);
    }
    return true;
  } catch {
    return false;
  }
}

function isStoredUserPreferences(value: unknown): value is UserPreferences {
  if (!(value && typeof value === "object")) {
    return false;
  }

  const record = value as Partial<UserPreferences>;
  return typeof record.showGrid === "boolean" && typeof record.showNumbers === "boolean";
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
