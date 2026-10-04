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

export function saveValue(key: string, value: unknown): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Silently ignore storage failures (quota exceeded, security restrictions, etc.)
  }
}
