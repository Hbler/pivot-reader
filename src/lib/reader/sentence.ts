import type { Token } from "./types.ts";

export function sentenceBounds(
  tokens: Token[],
  i: number,
): [start: number, end: number] {
  if (tokens.length === 0) {
    return [0, -1];
  }

  const validI = Number.isFinite(i) ? Math.floor(i) : 0;
  const clamped = Math.max(0, Math.min(tokens.length - 1, validI));

  let start = clamped;
  while (
    start > 0 &&
    !tokens[start - 1].sentenceEnd &&
    !tokens[start - 1].paragraphEnd
  ) {
    start--;
  }

  let end = clamped;
  while (
    end < tokens.length - 1 &&
    !tokens[end].sentenceEnd &&
    !tokens[end].paragraphEnd
  ) {
    end++;
  }

  return [start, end];
}
