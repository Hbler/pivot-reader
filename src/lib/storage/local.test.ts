import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadValue, saveValue } from "./local.ts";

describe("storage/local", () => {
  const originalLocalStorage = globalThis.localStorage;

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe("with working storage", () => {
    let store: Record<string, string>;

    beforeEach(() => {
      store = {};
      const fakeStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
      };
      Object.defineProperty(globalThis, "localStorage", {
        value: fakeStorage,
        writable: true,
        configurable: true,
      });
    });

    it("saves values with pivot: prefix and loads them decoded", () => {
      saveValue("wpm", 450);
      expect(store["pivot:wpm"]).toBe("450");
      expect(loadValue<number>("wpm")).toBe(450);
    });

    it("saves and loads complex objects", () => {
      const data = { wpm: 350, easeIn: false };
      saveValue("settings", data);
      expect(loadValue<typeof data>("settings")).toEqual(data);
    });

    it("returns null when loading a non-existent key", () => {
      expect(loadValue("nonExistentKey")).toBeNull();
    });

    it("returns null when stored data is invalid JSON", () => {
      store["pivot:badJson"] = "{not valid json";
      expect(loadValue("badJson")).toBeNull();
    });
  });

  describe("with throwing storage", () => {
    beforeEach(() => {
      const throwingStorage = {
        getItem: () => {
          throw new Error("SecurityError: Access is denied");
        },
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {
          throw new Error("Error");
        },
        clear: () => {
          throw new Error("Error");
        },
        length: 0,
        key: () => null,
      };
      Object.defineProperty(globalThis, "localStorage", {
        value: throwingStorage,
        writable: true,
        configurable: true,
      });
    });

    it("returns null when loadValue encounters a storage error", () => {
      expect(() => {
        const val = loadValue("anyKey");
        expect(val).toBeNull();
      }).not.toThrow();
    });

    it("silently ignores errors when saveValue encounters a storage error", () => {
      expect(() => {
        saveValue("anyKey", "value");
      }).not.toThrow();
    });
  });

  describe("with missing storage", () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, "localStorage", {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it("returns null from loadValue when localStorage is undefined", () => {
      expect(loadValue("key")).toBeNull();
    });

    it("does nothing in saveValue when localStorage is undefined", () => {
      expect(() => saveValue("key", "val")).not.toThrow();
    });
  });
});
