import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, WPM_MAX, WPM_MIN } from "../reader/types.ts";
import { clampPosition, sanitizeSettings } from "./validate.ts";

describe("sanitizeSettings", () => {
  it("returns default settings when given garbage (null, undefined, non-object)", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("string")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(12345)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(true)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings([1, 2, 3])).toEqual(DEFAULT_SETTINGS);
  });

  describe("wpm sanitization", () => {
    it("clamps wpm below WPM_MIN to WPM_MIN", () => {
      const sanitized = sanitizeSettings({ wpm: 50 });
      expect(sanitized.wpm).toBe(WPM_MIN);
    });

    it("clamps negative wpm to WPM_MIN", () => {
      const sanitized = sanitizeSettings({ wpm: -300 });
      expect(sanitized.wpm).toBe(WPM_MIN);
    });

    it("clamps wpm above WPM_MAX to WPM_MAX", () => {
      const sanitized = sanitizeSettings({ wpm: 1500 });
      expect(sanitized.wpm).toBe(WPM_MAX);
    });

    it("rounds floating point wpm to nearest integer", () => {
      expect(sanitizeSettings({ wpm: 320.4 }).wpm).toBe(320);
      expect(sanitizeSettings({ wpm: 320.6 }).wpm).toBe(321);
    });

    it("ignores non-finite numbers (NaN, Infinity) and retains default", () => {
      expect(sanitizeSettings({ wpm: NaN }).wpm).toBe(DEFAULT_SETTINGS.wpm);
      expect(sanitizeSettings({ wpm: Infinity }).wpm).toBe(
        DEFAULT_SETTINGS.wpm,
      );
      expect(sanitizeSettings({ wpm: -Infinity }).wpm).toBe(
        DEFAULT_SETTINGS.wpm,
      );
      expect(sanitizeSettings({ wpm: "500" }).wpm).toBe(DEFAULT_SETTINGS.wpm);
    });
  });

  describe("boolean flags sanitization", () => {
    it("accepts valid boolean values", () => {
      const settings = sanitizeSettings({
        punctuationPauses: false,
        longWordSlowdown: false,
        easeIn: false,
      });
      expect(settings.punctuationPauses).toBe(false);
      expect(settings.longWordSlowdown).toBe(false);
      expect(settings.easeIn).toBe(false);
    });

    it("ignores non-boolean values and retains defaults", () => {
      const settings = sanitizeSettings({
        punctuationPauses: "false",
        longWordSlowdown: 0,
        easeIn: null,
      });
      expect(settings.punctuationPauses).toBe(
        DEFAULT_SETTINGS.punctuationPauses,
      );
      expect(settings.longWordSlowdown).toBe(DEFAULT_SETTINGS.longWordSlowdown);
      expect(settings.easeIn).toBe(DEFAULT_SETTINGS.easeIn);
    });
  });

  describe("partial input", () => {
    it("merges partial valid settings with defaults", () => {
      const settings = sanitizeSettings({ wpm: 450 });
      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        wpm: 450,
      });
    });
  });
});

describe("clampPosition", () => {
  it("returns 0 for non-number inputs (null, undefined, string, object)", () => {
    expect(clampPosition(null, 10)).toBe(0);
    expect(clampPosition(undefined, 10)).toBe(0);
    expect(clampPosition("5", 10)).toBe(0);
    expect(clampPosition({}, 10)).toBe(0);
    expect(clampPosition([], 10)).toBe(0);
  });

  it("returns 0 for non-finite numbers (NaN, Infinity)", () => {
    expect(clampPosition(NaN, 10)).toBe(0);
    expect(clampPosition(Infinity, 10)).toBe(0);
    expect(clampPosition(-Infinity, 10)).toBe(0);
  });

  it("clamps negative positions to 0", () => {
    expect(clampPosition(-1, 10)).toBe(0);
    expect(clampPosition(-100, 10)).toBe(0);
  });

  it("floors floating point positions", () => {
    expect(clampPosition(3.2, 10)).toBe(3);
    expect(clampPosition(3.9, 10)).toBe(3);
  });

  it("clamps positions larger than tokenCount - 1 to the last index", () => {
    expect(clampPosition(10, 10)).toBe(9);
    expect(clampPosition(50, 10)).toBe(9);
  });

  it("handles empty text (tokenCount = 0) by clamping to 0", () => {
    expect(clampPosition(0, 0)).toBe(0);
    expect(clampPosition(5, 0)).toBe(0);
    expect(clampPosition(-5, 0)).toBe(0);
  });

  it("returns valid in-bounds position as-is", () => {
    expect(clampPosition(0, 10)).toBe(0);
    expect(clampPosition(5, 10)).toBe(5);
    expect(clampPosition(9, 10)).toBe(9);
  });
});
