export type PdfLine = {
  text: string;
  top: number;
  height: number;
};

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
};

export function itemsToLines(
  items: PdfTextItem[],
  pageHeight: number,
): PdfLine[] {
  const lines: PdfLine[] = [];
  let currentLine: {
    text: string;
    y: number;
    height: number;
    lastItem: { x: number; width: number };
  } | null = null;

  const flush = (line: typeof currentLine) => {
    if (line !== null) {
      const trimmed = line.text.trim();
      if (trimmed.length > 0) {
        lines.push({
          text: trimmed,
          top: pageHeight - line.y,
          height: line.height,
        });
      }
    }
  };

  for (const item of items) {
    if (item.str === "") {
      if (item.hasEOL && currentLine !== null) {
        flush(currentLine);
        currentLine = null;
      }
      continue;
    }

    if (currentLine === null) {
      currentLine = {
        text: item.str,
        y: item.y,
        height: item.height,
        lastItem: { x: item.x, width: item.width },
      };
    } else {
      const threshold = Math.max(currentLine.height, item.height) / 2;
      const isNewLine = Math.abs(item.y - currentLine.y) > threshold;

      if (isNewLine) {
        flush(currentLine);
        currentLine = {
          text: item.str,
          y: item.y,
          height: item.height,
          lastItem: { x: item.x, width: item.width },
        };
      } else {
        const gap =
          item.x - (currentLine.lastItem.x + currentLine.lastItem.width);
        if (
          !/\s$/.test(currentLine.text) &&
          !/^\s/.test(item.str) &&
          gap > 0.15 * item.height
        ) {
          currentLine.text += " ";
        }
        currentLine.text += item.str;
        if (item.height > currentLine.height) {
          currentLine.height = item.height;
        }
        currentLine.lastItem = { x: item.x, width: item.width };
      }
    }

    if (item.hasEOL) {
      flush(currentLine);
      currentLine = null;
    }
  }

  flush(currentLine);
  return lines;
}

const PAGE_NUM_RE = /^(page\s+)?[-–—]?\s*\d{1,4}\s*[-–—]?(\s+of\s+\d{1,4})?$/i;

export function dropPageNumbers(lines: PdfLine[]): PdfLine[] {
  if (lines.length === 0) {
    return [];
  }

  let start = 0;
  let end = lines.length;

  if (PAGE_NUM_RE.test(lines[0].text.trim())) {
    start = 1;
  }
  if (end > start && PAGE_NUM_RE.test(lines[end - 1].text.trim())) {
    end -= 1;
  }

  return lines.slice(start, end);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function linesToParagraphs(lines: PdfLine[]): string[] {
  const validLines = lines.filter((l) => l.text.trim().length > 0);
  if (validLines.length === 0) {
    return [];
  }

  const medianHeight = median(validLines.map((l) => l.height));
  const candidateGaps: number[] = [];
  for (let i = 0; i < validLines.length - 1; i++) {
    const gap = validLines[i + 1].top - validLines[i].top;
    if (gap >= 0.5 * medianHeight) {
      candidateGaps.push(gap);
    }
  }

  const reference =
    candidateGaps.length > 0 ? Math.min(...candidateGaps) : 1.2 * medianHeight;

  const paragraphs: string[] = [];
  let current: string[] = [validLines[0].text];

  for (let i = 0; i < validLines.length - 1; i++) {
    const gap = validLines[i + 1].top - validLines[i].top;
    if (gap > 1.5 * reference) {
      paragraphs.push(current.join("\n"));
      current = [validLines[i + 1].text];
    } else {
      current.push(validLines[i + 1].text);
    }
  }

  paragraphs.push(current.join("\n"));
  return paragraphs;
}

const HYPHEN_RE = /(\p{L})[-‐\u00AD]\s*\n\s*(\p{Ll})/gu;

export function joinHyphenation(text: string): string {
  return text.replace(HYPHEN_RE, "$1$2");
}

const TERMINAL_PUNCT_RE = /[.!?…:;"”'’)]\s*$/u;
const STARTS_WITH_LOWER_RE = /^\s*\p{Ll}/u;

export function pagesToText(pages: PdfLine[][]): string {
  const allParagraphs: string[] = [];

  for (const pageLines of pages) {
    const cleaned = dropPageNumbers(pageLines);
    const pageParagraphs = linesToParagraphs(cleaned);
    if (pageParagraphs.length === 0) {
      continue;
    }

    if (allParagraphs.length > 0) {
      const lastParagraph = allParagraphs[allParagraphs.length - 1];
      const firstParagraph = pageParagraphs[0];

      if (
        !TERMINAL_PUNCT_RE.test(lastParagraph) &&
        STARTS_WITH_LOWER_RE.test(firstParagraph)
      ) {
        allParagraphs[allParagraphs.length - 1] =
          `${lastParagraph}\n${firstParagraph}`;
        for (let i = 1; i < pageParagraphs.length; i++) {
          allParagraphs.push(pageParagraphs[i]);
        }
        continue;
      }
    }

    for (const para of pageParagraphs) {
      allParagraphs.push(para);
    }
  }

  const combined = allParagraphs.join("\n\n");
  return joinHyphenation(combined);
}
