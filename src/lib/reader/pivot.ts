const LETTER_OR_DIGIT_RE = /^[\p{L}\p{N}]$/u;

export function pivotIndex(word: string): number {
  const chars = Array.from(word);
  const codePointLength = chars.length;
  if (codePointLength === 0) {
    return 0;
  }

  let lead = 0;
  while (lead < codePointLength && !LETTER_OR_DIGIT_RE.test(chars[lead])) {
    lead++;
  }

  let trail = 0;
  while (
    codePointLength - trail > lead &&
    !LETTER_OR_DIGIT_RE.test(chars[codePointLength - 1 - trail])
  ) {
    trail++;
  }

  const n = codePointLength - lead - trail;

  if (n === 0) {
    return Math.floor(codePointLength / 2);
  }

  const p = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  return lead + p;
}

export function splitAtPivot(
  word: string,
): [left: string, pivot: string, right: string] {
  if (word === "") {
    return ["", "", ""];
  }
  const chars = Array.from(word);
  const idx = pivotIndex(word);
  const left = chars.slice(0, idx).join("");
  const pivot = chars[idx] ?? "";
  const right = chars.slice(idx + 1).join("");
  return [left, pivot, right];
}
