import {
  DEFAULT_SETTINGS,
  EASE_IN_STEPS,
  WPM_MAX,
  WPM_MIN,
  type Settings,
  type Token,
} from "./types.ts";
import { tokenize } from "./tokenize.ts";
import { delayFor } from "./timing.ts";
import { sentenceBounds } from "./sentence.ts";
import { clampPosition } from "../storage/validate.ts";

export class Player {
  tokens: Token[] = $state([]);
  index: number = $state(0);
  isPlaying: boolean = $state(false);
  finished: boolean = $state(false);
  settings: Settings = $state({ ...DEFAULT_SETTINGS });

  current: Token | undefined = $derived(this.tokens[this.index]);
  remainingMinutes: number = $derived(
    Math.max(0, this.tokens.length - this.index - 1) / this.settings.wpm,
  );

  #timer: ReturnType<typeof setTimeout> | null = null;
  #easeInRemaining: number = 0;

  constructor(settings: Settings = { ...DEFAULT_SETTINGS }) {
    this.settings = { ...settings };
  }

  load(text: string, restorePosition?: unknown): void {
    this.pause();
    this.tokens = tokenize(text);
    this.index = clampPosition(restorePosition ?? 0, this.tokens.length);
    this.finished = false;
  }

  play(): void {
    if (this.tokens.length === 0) return;
    if (this.index >= this.tokens.length - 1) {
      this.index = 0;
    }
    this.#startScheduling();
  }

  #startScheduling(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.finished = false;
    this.isPlaying = true;
    this.#easeInRemaining = this.settings.easeIn ? EASE_IN_STEPS : 0;
    this.#schedule();
  }

  #schedule(): void {
    if (!this.isPlaying) return;

    if (this.index >= this.tokens.length - 1) {
      this.isPlaying = false;
      this.finished = true;
      return;
    }

    const delay = delayFor(
      this.tokens[this.index],
      this.settings,
      this.#easeInRemaining,
    );
    if (this.#easeInRemaining > 0) {
      this.#easeInRemaining--;
    }

    this.#timer = setTimeout(() => {
      this.index++;
      this.#schedule();
    }, delay);
  }

  pause(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.isPlaying = false;
  }

  toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  jumpTo(i: number): void {
    if (this.tokens.length === 0) return;
    const target = clampPosition(i, this.tokens.length);
    this.finished = false;
    this.index = target;
    if (this.isPlaying) {
      this.#startScheduling();
    }
  }

  stepWord(dir: -1 | 1): void {
    this.jumpTo(this.index + dir);
  }

  stepSentence(dir: -1 | 1): void {
    if (this.tokens.length === 0) return;
    const [start] = sentenceBounds(this.tokens, this.index);
    if (dir < 0) {
      if (this.index > start) {
        this.jumpTo(start);
      } else if (start > 0) {
        const [prevStart] = sentenceBounds(this.tokens, start - 1);
        this.jumpTo(prevStart);
      } else {
        this.jumpTo(0);
      }
    } else {
      const [, end] = sentenceBounds(this.tokens, this.index);
      this.jumpTo(end + 1);
    }
  }

  setWpm(v: number): void {
    if (!Number.isFinite(v)) return;
    const rounded = Math.round(v);
    this.settings.wpm = Math.max(WPM_MIN, Math.min(WPM_MAX, rounded));
  }

  changeSpeed(delta: number): void {
    this.setWpm(this.settings.wpm + delta);
  }

  dispose(): void {
    this.pause();
  }
}
