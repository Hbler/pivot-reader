import { describe, expect, it } from "vitest";
import {
  dropPageNumbers,
  itemsToLines,
  joinHyphenation,
  linesToParagraphs,
  pagesToText,
  type PdfLine,
  type PdfTextItem,
} from "./pdf-text.ts";

describe("dropPageNumbers", () => {
  it("drops page numbers at the top and bottom of a page", () => {
    const lines: PdfLine[] = [
      { text: "1", top: 10, height: 10 },
      { text: "Header content", top: 30, height: 10 },
      { text: "Body paragraph line.", top: 50, height: 10 },
      { text: "- 42 -", top: 700, height: 10 },
    ];
    const result = dropPageNumbers(lines);
    expect(result.map((l) => l.text)).toEqual([
      "Header content",
      "Body paragraph line.",
    ]);
  });

  it("drops 'Page 3 of 10'", () => {
    const lines: PdfLine[] = [
      { text: "Page 3 of 10", top: 10, height: 10 },
      { text: "Some article content.", top: 30, height: 10 },
    ];
    const result = dropPageNumbers(lines);
    expect(result.map((l) => l.text)).toEqual(["Some article content."]);
  });

  it("keeps numbers in the middle of a page", () => {
    const lines: PdfLine[] = [
      { text: "Title of Chapter", top: 10, height: 10 },
      { text: "42", top: 50, height: 10 },
      { text: "Conclusion line", top: 100, height: 10 },
    ];
    const result = dropPageNumbers(lines);
    expect(result.map((l) => l.text)).toEqual([
      "Title of Chapter",
      "42",
      "Conclusion line",
    ]);
  });

  it("keeps a line like '1984 was a year' at top or bottom", () => {
    const lines: PdfLine[] = [
      { text: "1984 was a year", top: 10, height: 10 },
      { text: "A great novel indeed.", top: 30, height: 10 },
    ];
    const result = dropPageNumbers(lines);
    expect(result.map((l) => l.text)).toEqual([
      "1984 was a year",
      "A great novel indeed.",
    ]);
  });

  it("handles single-line matching page number", () => {
    const lines: PdfLine[] = [{ text: "1", top: 10, height: 10 }];
    expect(dropPageNumbers(lines)).toEqual([]);
  });

  it("handles empty lines array", () => {
    expect(dropPageNumbers([])).toEqual([]);
  });
});

describe("linesToParagraphs", () => {
  it("splits paragraphs on gaps > 1.5x reference gap", () => {
    const lines: PdfLine[] = [
      { text: "Para 1 Line 1", top: 100, height: 12 },
      { text: "Para 1 Line 2", top: 116, height: 12 }, // gap = 16
      { text: "Para 1 Line 3", top: 132, height: 12 }, // gap = 16
      { text: "Para 2 Line 1", top: 172, height: 12 }, // gap = 40 (> 1.5 * 16 = 24)
      { text: "Para 2 Line 2", top: 188, height: 12 }, // gap = 16
    ];
    const paragraphs = linesToParagraphs(lines);
    expect(paragraphs).toEqual([
      "Para 1 Line 1\nPara 1 Line 2\nPara 1 Line 3",
      "Para 2 Line 1\nPara 2 Line 2",
    ]);
  });

  it("splits first gap for three lines with gaps [2L, L]", () => {
    // L = 12, height 10: gaps [24, 12] -> reference = 12, first gap (24 > 18) breaks
    const lines: PdfLine[] = [
      { text: "Line 1", top: 0, height: 10 },
      { text: "Line 2", top: 24, height: 10 },
      { text: "Line 3", top: 36, height: 10 },
    ];
    expect(linesToParagraphs(lines)).toEqual(["Line 1", "Line 2\nLine 3"]);
  });

  it("splits second gap for three lines with gaps [L, 2L]", () => {
    // L = 12, height 10: gaps [12, 24] -> reference = 12, second gap (24 > 18) breaks
    const lines: PdfLine[] = [
      { text: "Line 1", top: 0, height: 10 },
      { text: "Line 2", top: 12, height: 10 },
      { text: "Line 3", top: 36, height: 10 },
    ];
    expect(linesToParagraphs(lines)).toEqual(["Line 1\nLine 2", "Line 3"]);
  });

  it("does not treat a tiny superscript gap as the reference", () => {
    // lines at tops 0, 12, 14, 26 with heights 10, 10, 4, 10 -> no paragraph break
    const lines: PdfLine[] = [
      { text: "Line 1", top: 0, height: 10 },
      { text: "Line 2", top: 12, height: 10 },
      { text: "Line 3", top: 14, height: 4 },
      { text: "Line 4", top: 26, height: 10 },
    ];
    expect(linesToParagraphs(lines)).toEqual([
      "Line 1\nLine 2\nLine 3\nLine 4",
    ]);
  });

  it("falls back to median line height * 1.2 when there is no qualifying gap", () => {
    // 1 line: no gaps at all
    const singleLine: PdfLine[] = [{ text: "Solo line", top: 50, height: 10 }];
    expect(linesToParagraphs(singleLine)).toEqual(["Solo line"]);

    // 0 lines
    expect(linesToParagraphs([])).toEqual([]);

    // All gaps too small (< 0.5 * 10 = 5)
    const tinyGap: PdfLine[] = [
      { text: "Line A", top: 50, height: 10 },
      { text: "Line B", top: 52, height: 10 },
    ];
    expect(linesToParagraphs(tinyGap)).toEqual(["Line A\nLine B"]);

    // 2 lines with gap >= 0.5 * medianHeight use that gap as reference
    const normalGap: PdfLine[] = [
      { text: "Line A", top: 50, height: 10 },
      { text: "Line B", top: 62, height: 10 },
    ];
    expect(linesToParagraphs(normalGap)).toEqual(["Line A\nLine B"]);

    // 2 lines with a single gap don't break because reference is that gap
    const largeGap: PdfLine[] = [
      { text: "Line A", top: 50, height: 10 },
      { text: "Line B", top: 75, height: 10 },
    ];
    expect(linesToParagraphs(largeGap)).toEqual(["Line A\nLine B"]);
  });

  it("ignores empty-text lines", () => {
    const lines: PdfLine[] = [
      { text: "First line", top: 50, height: 10 },
      { text: "   ", top: 56, height: 10 },
      { text: "Second line", top: 62, height: 10 },
    ];
    expect(linesToParagraphs(lines)).toEqual(["First line\nSecond line"]);
  });
});

describe("joinHyphenation", () => {
  it("joins hyphen before lowercase across a line break", () => {
    expect(joinHyphenation("informa-\ntion")).toBe("information");
    expect(joinHyphenation("informa‐\ntion")).toBe("information");
    expect(joinHyphenation("informa-  \n  tion")).toBe("information");
  });

  it("joins soft hyphen before lowercase across a line break", () => {
    expect(joinHyphenation("informa\u00AD\ntion")).toBe("information");
  });

  it("leaves hyphen before uppercase or digit alone", () => {
    expect(joinHyphenation("Anglo-\nSaxon")).toBe("Anglo-\nSaxon");
    expect(joinHyphenation("step-\n1")).toBe("step-\n1");
  });
});

describe("pagesToText", () => {
  it("joins a paragraph continuing across a page break (including hyphen at page end)", () => {
    const page1: PdfLine[] = [
      { text: "Page 1", top: 10, height: 10 },
      { text: "This is a sentence that contin-", top: 50, height: 12 },
    ];
    const page2: PdfLine[] = [
      { text: "ues smoothly onto the next page.", top: 50, height: 12 },
      { text: "- 2 -", top: 700, height: 10 },
    ];

    const text = pagesToText([page1, page2]);
    expect(text).toBe(
      "This is a sentence that continues smoothly onto the next page.",
    );
  });

  it("does not join a paragraph ending with '.' at page end", () => {
    const page1: PdfLine[] = [
      { text: "This is a completed sentence.", top: 50, height: 12 },
    ];
    const page2: PdfLine[] = [
      { text: "another thought starting with lowercase.", top: 50, height: 12 },
    ];

    const text = pagesToText([page1, page2]);
    expect(text).toBe(
      "This is a completed sentence.\n\nanother thought starting with lowercase.",
    );
  });

  it("joins multiple paragraphs separated by blank lines and respects terminal punctuation", () => {
    const page1: PdfLine[] = [
      { text: "First paragraph line 1.", top: 50, height: 12 },
      { text: "First paragraph line 2.", top: 66, height: 12 },
      { text: "Second paragraph", top: 106, height: 12 },
    ];
    const page2: PdfLine[] = [
      { text: "continued text here.", top: 50, height: 12 },
    ];

    const text = pagesToText([page1, page2]);
    expect(text).toBe(
      "First paragraph line 1.\nFirst paragraph line 2.\n\nSecond paragraph\ncontinued text here.",
    );
  });
});

describe("itemsToLines", () => {
  it("inserts a space between two items on one baseline with a gap", () => {
    const items: PdfTextItem[] = [
      { str: "Hello", x: 10, y: 700, width: 20, height: 10, hasEOL: false },
      { str: "world", x: 35, y: 700, width: 20, height: 10, hasEOL: false },
    ];
    const lines = itemsToLines(items, 800);
    expect(lines).toEqual([{ text: "Hello world", top: 100, height: 10 }]);
  });

  it("does not insert a space between touching items", () => {
    const items: PdfTextItem[] = [
      { str: "super", x: 10, y: 700, width: 20, height: 10, hasEOL: false },
      { str: "script", x: 30, y: 700, width: 25, height: 10, hasEOL: false },
    ];
    const lines = itemsToLines(items, 800);
    expect(lines).toEqual([{ text: "superscript", top: 100, height: 10 }]);
  });

  it("does not double existing spaces", () => {
    // 1. Line ends with space
    const itemsTrailing: PdfTextItem[] = [
      { str: "Hello ", x: 10, y: 700, width: 25, height: 10, hasEOL: false },
      { str: "world", x: 40, y: 700, width: 20, height: 10, hasEOL: false },
    ];
    expect(itemsToLines(itemsTrailing, 800)).toEqual([
      { text: "Hello world", top: 100, height: 10 },
    ]);

    // 2. Next item starts with space
    const itemsLeading: PdfTextItem[] = [
      { str: "Hello", x: 10, y: 700, width: 20, height: 10, hasEOL: false },
      { str: " world", x: 35, y: 700, width: 25, height: 10, hasEOL: false },
    ];
    expect(itemsToLines(itemsLeading, 800)).toEqual([
      { text: "Hello world", top: 100, height: 10 },
    ]);

    // 3. Space as a standalone item
    const itemsSpaceItem: PdfTextItem[] = [
      { str: "Hello", x: 10, y: 700, width: 20, height: 10, hasEOL: false },
      { str: " ", x: 30, y: 700, width: 5, height: 10, hasEOL: false },
      { str: "world", x: 40, y: 700, width: 20, height: 10, hasEOL: false },
    ];
    expect(itemsToLines(itemsSpaceItem, 800)).toEqual([
      { text: "Hello world", top: 100, height: 10 },
    ]);
  });

  it("splits lines when an item has hasEOL", () => {
    const items: PdfTextItem[] = [
      { str: "First line", x: 10, y: 700, width: 40, height: 10, hasEOL: true },
      {
        str: "Second line",
        x: 10,
        y: 700,
        width: 45,
        height: 10,
        hasEOL: false,
      },
    ];
    const lines = itemsToLines(items, 800);
    expect(lines).toEqual([
      { text: "First line", top: 100, height: 10 },
      { text: "Second line", top: 100, height: 10 },
    ]);
  });

  it("splits lines on baseline change", () => {
    const items: PdfTextItem[] = [
      { str: "Line 1", x: 10, y: 700, width: 30, height: 10, hasEOL: false },
      { str: "Line 2", x: 10, y: 680, width: 30, height: 10, hasEOL: false },
    ];
    const lines = itemsToLines(items, 800);
    expect(lines).toEqual([
      { text: "Line 1", top: 100, height: 10 },
      { text: "Line 2", top: 120, height: 10 },
    ]);
  });

  it("converts top from bottom-based y and takes largest item height", () => {
    const items: PdfTextItem[] = [
      { str: "Base", x: 10, y: 250, width: 20, height: 12, hasEOL: false },
      { str: "text", x: 35, y: 252, width: 20, height: 16, hasEOL: false },
    ];
    const lines = itemsToLines(items, 1000);
    expect(lines).toEqual([{ text: "Base text", top: 750, height: 16 }]);
  });

  it("ends a line without adding text when an empty item has hasEOL", () => {
    const items: PdfTextItem[] = [
      { str: "Line 1", x: 10, y: 700, width: 30, height: 10, hasEOL: false },
      { str: "", x: 40, y: 700, width: 0, height: 0, hasEOL: true },
      { str: "Line 2", x: 10, y: 680, width: 30, height: 10, hasEOL: false },
    ];
    const lines = itemsToLines(items, 800);
    expect(lines).toEqual([
      { text: "Line 1", top: 100, height: 10 },
      { text: "Line 2", top: 120, height: 10 },
    ]);
  });

  it("drops lines whose trimmed text is empty", () => {
    const items: PdfTextItem[] = [
      { str: "", x: 0, y: 0, width: 0, height: 0, hasEOL: true },
      { str: "   ", x: 10, y: 750, width: 20, height: 10, hasEOL: true },
      {
        str: "Valid line",
        x: 10,
        y: 700,
        width: 40,
        height: 10,
        hasEOL: false,
      },
    ];
    const lines = itemsToLines(items, 800);
    expect(lines).toEqual([{ text: "Valid line", top: 100, height: 10 }]);
  });
});
