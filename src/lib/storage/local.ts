const PREFIX = "pivot:";

export function loadValue<T>(key: string): T | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveValue(key: string, value: unknown): boolean {
  try {
    if (typeof localStorage === "undefined") {
      return false;
    }
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
