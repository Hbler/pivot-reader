import type { Settings, Token } from "./types.ts";

const LETTER_OR_DIGIT_RE = /[\p{L}\p{N}]/gu;
const COMMA_PAUSE_RE = /[,;:—–-]["'”’)]*$/u;

export function delayFor(
  token: Token,
  settings: Settings,
  easeInRemaining: number,
): number {
  let m = 1;

  if (settings.longWordSlowdown) {
    const letters = token.text.match(LETTER_OR_DIGIT_RE)?.length ?? 0;
    if (letters > 8) {
      m += 0.3;
    }
    if (letters > 12) {
      m += 0.3;
    }
  }

  if (settings.punctuationPauses) {
    if (token.paragraphEnd) {
      m += 1.6;
    } else if (token.sentenceEnd) {
      m += 1.1;
    } else if (COMMA_PAUSE_RE.test(token.text)) {
      m += 0.5;
    }
  }

  if (settings.easeIn && easeInRemaining > 0) {
    m *= 1 + easeInRemaining * 0.25;
  }

  return (60000 / settings.wpm) * m;
}
