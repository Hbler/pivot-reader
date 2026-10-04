import { describe, expect, it } from "vitest";
import { sentenceBounds } from "./sentence.ts";
import type { Token } from "./types.ts";

describe("sentenceBounds", () => {
  it("returns [0, -1] for an empty tokens array", () => {
    expect(sentenceBounds([], 0)).toEqual([0, -1]);
    expect(sentenceBounds([], 5)).toEqual([0, -1]);
  });

  const tokens: Token[] = [
    // Sentence 0 (indices 0..2)
    { text: "First", sentenceEnd: false, paragraphEnd: false },
    { text: "sentence", sentenceEnd: false, paragraphEnd: false },
    { text: "here.", sentenceEnd: true, paragraphEnd: false },
    // Sentence 1 (indices 3..5, paragraph end at 5)
    { text: "Second", sentenceEnd: false, paragraphEnd: false },
    { text: "sentence", sentenceEnd: false, paragraphEnd: false },
    { text: "here.", sentenceEnd: true, paragraphEnd: true },
    // Sentence 2 in new paragraph (indices 6..8)
    { text: "Third", sentenceEnd: false, paragraphEnd: false },
    { text: "sentence", sentenceEnd: false, paragraphEnd: false },
    { text: "here.", sentenceEnd: true, paragraphEnd: true },
  ];

  it("finds bounds when index is at the start of a sentence", () => {
    expect(sentenceBounds(tokens, 0)).toEqual([0, 2]);
    expect(sentenceBounds(tokens, 3)).toEqual([3, 5]);
    expect(sentenceBounds(tokens, 6)).toEqual([6, 8]);
  });

  it("finds bounds when index is in the middle of a sentence", () => {
    expect(sentenceBounds(tokens, 1)).toEqual([0, 2]);
    expect(sentenceBounds(tokens, 4)).toEqual([3, 5]);
    expect(sentenceBounds(tokens, 7)).toEqual([6, 8]);
  });

  it("finds bounds when index is at the end of a sentence", () => {
    expect(sentenceBounds(tokens, 2)).toEqual([0, 2]);
    expect(sentenceBounds(tokens, 5)).toEqual([3, 5]);
    expect(sentenceBounds(tokens, 8)).toEqual([6, 8]);
  });

  it("does not cross paragraph boundaries even if not a sentenceEnd", () => {
    const tokensWithHeading: Token[] = [
      { text: "Chapter", sentenceEnd: false, paragraphEnd: false },
      { text: "One", sentenceEnd: false, paragraphEnd: true }, // heading without period
      { text: "The", sentenceEnd: false, paragraphEnd: false },
      { text: "story", sentenceEnd: false, paragraphEnd: false },
      { text: "begins.", sentenceEnd: true, paragraphEnd: true },
    ];
    // Heading: indices 0..1
    expect(sentenceBounds(tokensWithHeading, 0)).toEqual([0, 1]);
    expect(sentenceBounds(tokensWithHeading, 1)).toEqual([0, 1]);
    // Body paragraph: indices 2..4
    expect(sentenceBounds(tokensWithHeading, 2)).toEqual([2, 4]);
  });

  it("clamps out-of-range index to valid token range", () => {
    expect(sentenceBounds(tokens, -10)).toEqual([0, 2]);
    expect(sentenceBounds(tokens, 100)).toEqual([6, 8]);
    expect(sentenceBounds(tokens, NaN)).toEqual([0, 2]);
  });
});
