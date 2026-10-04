import type { Token } from "./types.ts";

const SENTENCE_END_RE = /[.!?…]["'”’)\]]*$/u;

export function tokenize(text: string): Token[] {
  const normalized = text.normalize("NFC").replace(/\r/g, "");
  const paragraphs = normalized.split(/\n\s*\n/);
  const tokens: Token[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    const count = words.length;
    for (let k = 0; k < count; k++) {
      const word = words[k];
      tokens.push({
        text: word,
        sentenceEnd: SENTENCE_END_RE.test(word),
        paragraphEnd: k === count - 1,
      });
    }
  }

  return tokens;
}
