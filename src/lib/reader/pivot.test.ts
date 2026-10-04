import { describe, expect, it } from "vitest";
import { pivotIndex, splitAtPivot } from "./pivot.ts";

describe("pivotIndex and splitAtPivot", () => {
  it("returns index 0 and empty chunks for empty string", () => {
    expect(pivotIndex("")).toBe(0);
    expect(splitAtPivot("")).toEqual(["", "", ""]);
  });

  describe("bands by core length", () => {
    it("band 1 (length 1): selects 1st letter (p = 0)", () => {
      expect(pivotIndex("a")).toBe(0);
      expect(splitAtPivot("a")).toEqual(["", "a", ""]);
    });

    it("band 2–5: selects 2nd letter (p = 1)", () => {
      expect(splitAtPivot("in")).toEqual(["i", "n", ""]);
      expect(splitAtPivot("cat")).toEqual(["c", "a", "t"]);
      expect(splitAtPivot("word")).toEqual(["w", "o", "rd"]);
      expect(splitAtPivot("words")).toEqual(["w", "o", "rds"]);
    });

    it("band 6–9: selects 3rd letter (p = 2)", () => {
      expect(splitAtPivot("reader")).toEqual(["re", "a", "der"]);
      expect(splitAtPivot("reading")).toEqual(["re", "a", "ding"]);
      expect(splitAtPivot("sentence")).toEqual(["se", "n", "tence"]);
      expect(splitAtPivot("something")).toEqual(["so", "m", "ething"]);
    });

    it("band 10–13: selects 4th letter (p = 3)", () => {
      expect(splitAtPivot("technology")).toEqual(["tec", "h", "nology"]);
      expect(splitAtPivot("celebration")).toEqual(["cel", "e", "bration"]);
      expect(splitAtPivot("relationship")).toEqual(["rel", "a", "tionship"]);
      expect(splitAtPivot("pronunciation")).toEqual(["pro", "n", "unciation"]);
    });

    it("band 14+: selects 5th letter (p = 4)", () => {
      expect(splitAtPivot("responsibility")).toEqual([
        "resp",
        "o",
        "nsibility",
      ]);
      expect(splitAtPivot("uncompromising")).toEqual([
        "unco",
        "m",
        "promising",
      ]);
      expect(splitAtPivot("incomprehensible")).toEqual([
        "inco",
        "m",
        "prehensible",
      ]);
    });
  });

  describe("punctuation handling", () => {
    it('offsets pivot by leading punctuation ("Hello → pivot on e)', () => {
      expect(pivotIndex('"Hello')).toBe(2);
      expect(splitAtPivot('"Hello')).toEqual(['"H', "e", "llo"]);

      expect(pivotIndex("“Hello")).toBe(2);
      expect(splitAtPivot("“Hello")).toEqual(["“H", "e", "llo"]);

      expect(pivotIndex("...world")).toBe(4);
      expect(splitAtPivot("...world")).toEqual(["...w", "o", "rld"]);
    });

    it("ignores trailing punctuation for core length", () => {
      expect(pivotIndex("Hello,")).toBe(1);
      expect(splitAtPivot("Hello,")).toEqual(["H", "e", "llo,"]);

      expect(pivotIndex('"Hello,"')).toBe(2);
      expect(splitAtPivot('"Hello,"')).toEqual(['"H', "e", 'llo,"']);

      expect(pivotIndex("stop!?!")).toBe(1);
      expect(splitAtPivot("stop!?!")).toEqual(["s", "t", "op!?!"]);
    });

    it("centres pivot on punctuation-only token using Math.floor(length / 2)", () => {
      expect(pivotIndex("-")).toBe(0);
      expect(splitAtPivot("-")).toEqual(["", "-", ""]);

      expect(pivotIndex("--")).toBe(1);
      expect(splitAtPivot("--")).toEqual(["-", "-", ""]);

      expect(pivotIndex("...")).toBe(1);
      expect(splitAtPivot("...")).toEqual([".", ".", "."]);

      expect(pivotIndex("----")).toBe(2);
      expect(splitAtPivot("----")).toEqual(["--", "-", "-"]);

      expect(pivotIndex("“---”")).toBe(2);
      expect(splitAtPivot("“---”")).toEqual(["“-", "-", "-”"]);
    });
  });

  describe("Unicode and emoji handling", () => {
    it("does not split astral characters or emojis into UTF-16 surrogates", () => {
      expect(pivotIndex("👋")).toBe(0);
      expect(splitAtPivot("👋")).toEqual(["", "👋", ""]);

      expect(pivotIndex("🚀launch")).toBe(3);
      expect(splitAtPivot("🚀launch")).toEqual(["🚀la", "u", "nch"]);

      expect(pivotIndex("🎉🎊🎋")).toBe(1);
      expect(splitAtPivot("🎉🎊🎋")).toEqual(["🎉", "🎊", "🎋"]);
    });

    it("correctly handles accented letters as part of the core word", () => {
      expect(splitAtPivot("café")).toEqual(["c", "a", "fé"]);
      expect(splitAtPivot("crème")).toEqual(["c", "r", "ème"]);
    });
  });
});
