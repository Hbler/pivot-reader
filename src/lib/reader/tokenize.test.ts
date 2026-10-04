import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenize.ts";
import { splitAtPivot } from "./pivot.ts";

describe("tokenize", () => {
  it("returns empty array for empty text", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("returns empty array for whitespace-only text", () => {
    expect(tokenize("   \n\n\t  \n  ")).toEqual([]);
  });

  it("handles CRLF line endings by removing carriage returns", () => {
    const text = "First line.\r\n\r\nSecond line.";
    const tokens = tokenize(text);
    expect(tokens).toEqual([
      { text: "First", sentenceEnd: false, paragraphEnd: false },
      { text: "line.", sentenceEnd: true, paragraphEnd: true },
      { text: "Second", sentenceEnd: false, paragraphEnd: false },
      { text: "line.", sentenceEnd: true, paragraphEnd: true },
    ]);
  });

  it("splits into paragraphs on double newlines and marks paragraphEnd on the last word of each", () => {
    const text = "First paragraph word.\n\nSecond paragraph word.";
    const tokens = tokenize(text);
    expect(tokens).toEqual([
      { text: "First", sentenceEnd: false, paragraphEnd: false },
      { text: "paragraph", sentenceEnd: false, paragraphEnd: false },
      { text: "word.", sentenceEnd: true, paragraphEnd: true },
      { text: "Second", sentenceEnd: false, paragraphEnd: false },
      { text: "paragraph", sentenceEnd: false, paragraphEnd: false },
      { text: "word.", sentenceEnd: true, paragraphEnd: true },
    ]);
  });

  it("handles multiple consecutive newlines and extra spaces between paragraphs", () => {
    const text = "Para one.\n  \n\n   \nPara two.";
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.text)).toEqual(["Para", "one.", "Para", "two."]);
    expect(tokens[1].paragraphEnd).toBe(true);
    expect(tokens[3].paragraphEnd).toBe(true);
  });

  it("identifies sentence endings with period, question mark, exclamation mark, and ellipsis", () => {
    const text = "One. Two! Three? Four… Five";
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.sentenceEnd)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it("identifies sentence endings followed by various closing quotes and brackets", () => {
    const cases = [
      'Said: "Yes!"',
      "Said: 'No.'",
      "Said: “Wait!”",
      "Said: ‘Stop.’",
      "Note (inside.)",
      "Ref [source?]",
      "Mixed?!\"')",
    ];
    for (const phrase of cases) {
      const tokens = tokenize(phrase);
      const lastToken = tokens[tokens.length - 1];
      expect(lastToken.sentenceEnd).toBe(true);
    }
  });

  it("marks non-sentence-ending punctuation as sentenceEnd false", () => {
    const text = 'word, another; next: well-known "quoted" text';
    const tokens = tokenize(text);
    for (const token of tokens) {
      expect(token.sentenceEnd).toBe(false);
    }
  });

  it("normalizes decomposed input with NFC before tokenizing", () => {
    const decomposed = "résumé".normalize("NFD");
    expect(decomposed).not.toBe("résumé");

    const tokens = tokenize(decomposed);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].text === "résumé").toBe(true);
    expect(splitAtPivot(tokens[0].text)).toEqual(splitAtPivot("résumé"));
  });
});
