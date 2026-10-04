import { describe, expect, it } from "vitest";
import { delayFor } from "./timing.ts";
import type { Settings, Token } from "./types.ts";

describe("delayFor", () => {
  const baseSettings: Settings = {
    wpm: 300, // base delay = 60000 / 300 = 200ms
    punctuationPauses: true,
    longWordSlowdown: true,
    easeIn: true,
  };

  it("calculates base delay for a standard short word with no extras", () => {
    const token: Token = {
      text: "word",
      sentenceEnd: false,
      paragraphEnd: false,
    };
    expect(delayFor(token, baseSettings, 0)).toBe(200);
  });

  describe("long word slowdown", () => {
    it("adds 0.3 for words with more than 8 letters", () => {
      const token: Token = {
        text: "something",
        sentenceEnd: false,
        paragraphEnd: false,
      }; // 9 letters
      expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 1.3);
    });

    it("adds another 0.3 (total 0.6) for words with more than 12 letters", () => {
      const token: Token = {
        text: "pronunciation",
        sentenceEnd: false,
        paragraphEnd: false,
      }; // 13 letters
      expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 1.6);
    });

    it("ignores non-letter characters when counting word length", () => {
      const token: Token = {
        text: '"word!"',
        sentenceEnd: false,
        paragraphEnd: false,
      }; // 4 letters
      expect(delayFor(token, baseSettings, 0)).toBe(200);
    });

    it("can be disabled via settings flag", () => {
      const token: Token = {
        text: "pronunciation",
        sentenceEnd: false,
        paragraphEnd: false,
      };
      const settings = { ...baseSettings, longWordSlowdown: false };
      expect(delayFor(token, settings, 0)).toBe(200);
    });
  });

  describe("punctuation pauses", () => {
    it("adds 0.5 for comma, semicolon, colon, or dashes", () => {
      const cases = [
        "word,",
        "word;",
        "word:",
        "word—",
        "word–",
        "word-",
        'word,"',
        "word;')",
      ];
      for (const text of cases) {
        const token: Token = { text, sentenceEnd: false, paragraphEnd: false };
        expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 1.5);
      }
    });

    it("adds 1.1 for sentence ends", () => {
      const token: Token = {
        text: "end.",
        sentenceEnd: true,
        paragraphEnd: false,
      };
      expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 2.1);
    });

    it("adds 1.6 for paragraph ends", () => {
      const token: Token = {
        text: "end",
        sentenceEnd: false,
        paragraphEnd: true,
      };
      expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 2.6);
    });

    it("gives paragraph-end precedence over sentence-end when both are true", () => {
      const token: Token = {
        text: "end.",
        sentenceEnd: true,
        paragraphEnd: true,
      };
      // m should be 1 + 1.6 = 2.6 (not 1 + 1.6 + 1.1 = 3.7)
      expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 2.6);
    });

    it("can be disabled via settings flag", () => {
      const token: Token = {
        text: "end.",
        sentenceEnd: true,
        paragraphEnd: true,
      };
      const settings = { ...baseSettings, punctuationPauses: false };
      expect(delayFor(token, settings, 0)).toBe(200);
    });
  });

  describe("ease-in ramp", () => {
    it("applies multipliers 2.0, 1.75, 1.5, 1.25 for remaining steps 4, 3, 2, 1", () => {
      const token: Token = {
        text: "word",
        sentenceEnd: false,
        paragraphEnd: false,
      };
      expect(delayFor(token, baseSettings, 4)).toBeCloseTo(200 * 2.0);
      expect(delayFor(token, baseSettings, 3)).toBeCloseTo(200 * 1.75);
      expect(delayFor(token, baseSettings, 2)).toBeCloseTo(200 * 1.5);
      expect(delayFor(token, baseSettings, 1)).toBeCloseTo(200 * 1.25);
      expect(delayFor(token, baseSettings, 0)).toBeCloseTo(200 * 1.0);
    });

    it("can be disabled via settings flag", () => {
      const token: Token = {
        text: "word",
        sentenceEnd: false,
        paragraphEnd: false,
      };
      const settings = { ...baseSettings, easeIn: false };
      expect(delayFor(token, settings, 4)).toBe(200);
    });
  });

  describe("combined extras", () => {
    it("combines long word, sentence end, and ease-in multiplier", () => {
      // 9 letters (+0.3), sentence end (+1.1) -> m = 1 + 0.3 + 1.1 = 2.4
      // ease-in step 4 (x 2.0) -> m = 2.4 * 2.0 = 4.8
      // 200 * 4.8 = 960ms
      const token: Token = {
        text: "something.",
        sentenceEnd: true,
        paragraphEnd: false,
      };
      expect(delayFor(token, baseSettings, 4)).toBeCloseTo(200 * 4.8);
    });
  });
});
