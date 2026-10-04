import {
  DEFAULT_SETTINGS,
  WPM_MAX,
  WPM_MIN,
  type Settings,
} from "../reader/types.ts";

export function sanitizeSettings(raw: unknown): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS };

  if (raw === null || typeof raw !== "object") {
    return result;
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.wpm === "number" && Number.isFinite(obj.wpm)) {
    const rounded = Math.round(obj.wpm);
    result.wpm = Math.max(WPM_MIN, Math.min(WPM_MAX, rounded));
  }

  if (typeof obj.punctuationPauses === "boolean") {
    result.punctuationPauses = obj.punctuationPauses;
  }

  if (typeof obj.longWordSlowdown === "boolean") {
    result.longWordSlowdown = obj.longWordSlowdown;
  }

  if (typeof obj.easeIn === "boolean") {
    result.easeIn = obj.easeIn;
  }

  return result;
}

export function clampPosition(raw: unknown, tokenCount: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return 0;
  }

  const maxPosition = Math.max(0, tokenCount - 1);
  const floored = Math.floor(raw);
  return Math.max(0, Math.min(maxPosition, floored));
}
