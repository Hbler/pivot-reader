import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "./player.svelte.ts";
import { DEFAULT_SETTINGS, WPM_MAX, WPM_MIN } from "./types.ts";

describe("Player", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("load", () => {
    it("clamps restored position to valid range", () => {
      const player = new Player();
      player.load("one two three", 10);
      expect(player.index).toBe(2);

      player.load("one two three", -5);
      expect(player.index).toBe(0);

      player.load("one two three", 1);
      expect(player.index).toBe(1);

      player.load("one two three", "invalid");
      expect(player.index).toBe(0);
    });

    it("resets finished to false and pauses if playing", () => {
      const player = new Player({ ...DEFAULT_SETTINGS, easeIn: false });
      player.load("one two");
      player.play();
      expect(player.isPlaying).toBe(true);

      player.load("alpha beta gamma", 1);
      expect(player.isPlaying).toBe(false);
      expect(player.finished).toBe(false);
      expect(player.index).toBe(1);
      expect(player.tokens).toHaveLength(3);
    });
  });

  describe("play and scheduling", () => {
    it("does nothing when tokens array is empty", () => {
      const player = new Player();
      player.load("");
      expect(player.tokens).toHaveLength(0);

      player.play();
      expect(player.isPlaying).toBe(false);
      expect(player.finished).toBe(false);
      expect(player.index).toBe(0);

      vi.advanceTimersByTime(1000);
      expect(player.index).toBe(0);
    });

    it("advances after exactly 100 ms per plain word at 600 WPM with easeIn off", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600, // 60000 / 600 = 100ms
        easeIn: false,
      });
      player.load("cat dog fox bat");
      player.play();

      expect(player.isPlaying).toBe(true);
      expect(player.index).toBe(0);
      expect(player.current?.text).toBe("cat");

      // After 99ms, index should not have advanced
      vi.advanceTimersByTime(99);
      expect(player.index).toBe(0);

      // Exactly at 100ms, advances to index 1
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(1);
      expect(player.current?.text).toBe("dog");

      // Next plain word at 200ms total
      vi.advanceTimersByTime(99);
      expect(player.index).toBe(1);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(2);
      expect(player.current?.text).toBe("fox");

      // Next plain word at 300ms total
      vi.advanceTimersByTime(100);
      expect(player.index).toBe(3);
      expect(player.current?.text).toBe("bat");
    });

    it("applies punctuation and ease-in delays from delayFor", () => {
      // 1. Ease-in on first 4 words at 300 WPM (base delay 200ms)
      // Step 4 multiplier: 2.0  -> 400ms
      // Step 3 multiplier: 1.75 -> 350ms
      // Step 2 multiplier: 1.5  -> 300ms
      // Step 1 multiplier: 1.25 -> 250ms
      // Step 0 multiplier: 1.0  -> 200ms
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 300,
        easeIn: true,
      });
      player.load("cat dog fox bat pig owl");
      player.play();

      // Word 0 (cat): 400ms delay
      expect(player.index).toBe(0);
      vi.advanceTimersByTime(399);
      expect(player.index).toBe(0);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(1);

      // Word 1 (dog): 350ms delay
      vi.advanceTimersByTime(349);
      expect(player.index).toBe(1);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(2);

      // Word 2 (fox): 300ms delay
      vi.advanceTimersByTime(299);
      expect(player.index).toBe(2);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(3);

      // Word 3 (bat): 250ms delay
      vi.advanceTimersByTime(249);
      expect(player.index).toBe(3);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(4);

      // Word 4 (pig, ease-in finished): 200ms delay
      vi.advanceTimersByTime(199);
      expect(player.index).toBe(4);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(5);

      // 2. Sentence end delay: 300 WPM, easeIn off, sentenceEnd token
      // Base delay = 200ms, sentenceEnd multiplier = 1 + 1.1 = 2.1 -> 420ms
      const sentencePlayer = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 300,
        easeIn: false,
        punctuationPauses: true,
      });
      sentencePlayer.load("end. Next");
      sentencePlayer.play();

      expect(sentencePlayer.index).toBe(0);
      vi.advanceTimersByTime(419);
      expect(sentencePlayer.index).toBe(0);
      vi.advanceTimersByTime(1);
      expect(sentencePlayer.index).toBe(1);
    });

    it("stops on the last token with finished = true and isPlaying = false, leaving the last word shown", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two three"); // indices 0, 1, 2
      player.play();

      // Word 0 -> word 1
      vi.advanceTimersByTime(100);
      expect(player.index).toBe(1);
      expect(player.isPlaying).toBe(true);
      expect(player.finished).toBe(false);

      // Word 1 -> word 2 (last token)
      vi.advanceTimersByTime(100);
      expect(player.index).toBe(2);
      expect(player.isPlaying).toBe(false);
      expect(player.finished).toBe(true);
      expect(player.current?.text).toBe("three");

      // Further time does not advance or change state
      vi.advanceTimersByTime(5000);
      expect(player.index).toBe(2);
      expect(player.isPlaying).toBe(false);
      expect(player.finished).toBe(true);
    });

    it("restarts from 0 when play is called after finishing", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two");
      player.play();

      // Advance to finish
      vi.advanceTimersByTime(100);
      expect(player.index).toBe(1);
      expect(player.finished).toBe(true);
      expect(player.isPlaying).toBe(false);

      // Calling play restarts from index 0
      player.play();
      expect(player.index).toBe(0);
      expect(player.finished).toBe(false);
      expect(player.isPlaying).toBe(true);
      expect(player.current?.text).toBe("one");

      // Advances normally
      vi.advanceTimersByTime(100);
      expect(player.index).toBe(1);
      expect(player.finished).toBe(true);
      expect(player.isPlaying).toBe(false);
    });
  });

  describe("pause and toggle", () => {
    it("stops advancing when paused", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two three four");
      player.play();

      vi.advanceTimersByTime(50);
      player.pause();
      expect(player.isPlaying).toBe(false);

      // Advance beyond the token delay; index must stay 0
      vi.advanceTimersByTime(1000);
      expect(player.index).toBe(0);

      // Resuming plays again
      player.play();
      expect(player.isPlaying).toBe(true);
      vi.advanceTimersByTime(100);
      expect(player.index).toBe(1);
    });

    it("toggles between playing and paused", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two three");

      expect(player.isPlaying).toBe(false);
      player.toggle();
      expect(player.isPlaying).toBe(true);

      player.toggle();
      expect(player.isPlaying).toBe(false);
    });
  });

  describe("stepWord", () => {
    it("clamps at both ends", () => {
      const player = new Player();
      player.load("one two three"); // 0, 1, 2

      expect(player.index).toBe(0);
      player.stepWord(-1);
      expect(player.index).toBe(0);

      player.stepWord(1);
      expect(player.index).toBe(1);

      player.stepWord(1);
      expect(player.index).toBe(2);

      player.stepWord(1);
      expect(player.index).toBe(2);
    });
  });

  describe("stepSentence", () => {
    const text =
      "First sentence here. Second sentence here. Third sentence here.";

    it("goes to sentence start from mid-sentence, and previous sentence start from sentence start", () => {
      const player = new Player();
      player.load(text); // Sentence 0: 0..2, Sentence 1: 3..5, Sentence 2: 6..8

      // Start mid-sentence 1 (index 4)
      player.jumpTo(4);
      expect(player.current?.text).toBe("sentence");

      // Back from mid-sentence goes to start of sentence 1 (index 3)
      player.stepSentence(-1);
      expect(player.index).toBe(3);
      expect(player.current?.text).toBe("Second");

      // Back from sentence start goes to start of previous sentence (index 0)
      player.stepSentence(-1);
      expect(player.index).toBe(0);
      expect(player.current?.text).toBe("First");

      // Back from first sentence start stays at 0
      player.stepSentence(-1);
      expect(player.index).toBe(0);
    });

    it("steps forward to start of next sentence", () => {
      const player = new Player();
      player.load(text);

      expect(player.index).toBe(0);

      // Forward goes to start of sentence 1 (index 3)
      player.stepSentence(1);
      expect(player.index).toBe(3);
      expect(player.current?.text).toBe("Second");

      // Forward goes to start of sentence 2 (index 6)
      player.stepSentence(1);
      expect(player.index).toBe(6);
      expect(player.current?.text).toBe("Third");

      // Forward from last sentence clamps to last index (8)
      player.stepSentence(1);
      expect(player.index).toBe(8);
      expect(player.current?.text).toBe("here.");
    });
  });

  describe("jumpTo", () => {
    it("keeps playing from the new index while playing and restarts ease-in", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: true,
      });
      player.load("one two three four five six");
      player.play();

      // Jump while playing to index 3
      player.jumpTo(3);
      expect(player.isPlaying).toBe(true);
      expect(player.index).toBe(3);
      expect(player.finished).toBe(false);

      // Ease-in should have restarted (step 4 = 100ms * 2.0 = 200ms)
      vi.advanceTimersByTime(199);
      expect(player.index).toBe(3);
      vi.advanceTimersByTime(1);
      expect(player.index).toBe(4);
    });

    it("is a no-op on empty text", () => {
      const player = new Player();
      player.load("");
      player.jumpTo(5);
      expect(player.index).toBe(0);
    });

    it("leaves index on the last token with finished = true and does not go to 0 when jumping to the last token while playing", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two three");
      player.play();
      expect(player.isPlaying).toBe(true);

      player.jumpTo(2);
      expect(player.index).toBe(2);
      expect(player.finished).toBe(true);
      expect(player.isPlaying).toBe(false);
      expect(player.current?.text).toBe("three");

      vi.advanceTimersByTime(1000);
      expect(player.index).toBe(2);
    });

    it("ends on the last token, not 0, when stepping forward from the second-to-last token while playing, and play() restarts from 0", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two three");
      player.play();

      player.jumpTo(1);
      expect(player.isPlaying).toBe(true);
      expect(player.index).toBe(1);

      player.stepWord(1);
      expect(player.index).toBe(2);
      expect(player.finished).toBe(true);
      expect(player.isPlaying).toBe(false);
      expect(player.current?.text).toBe("three");

      vi.advanceTimersByTime(1000);
      expect(player.index).toBe(2);

      player.play();
      expect(player.index).toBe(0);
      expect(player.finished).toBe(false);
      expect(player.isPlaying).toBe(true);
      expect(player.current?.text).toBe("one");
    });
  });

  describe("setWpm and changeSpeed", () => {
    it("clamps WPM between WPM_MIN and WPM_MAX and rounds non-integers", () => {
      const player = new Player();

      player.setWpm(50);
      expect(player.settings.wpm).toBe(WPM_MIN);

      player.setWpm(1500);
      expect(player.settings.wpm).toBe(WPM_MAX);

      player.setWpm(350.6);
      expect(player.settings.wpm).toBe(351);

      player.setWpm(350.4);
      expect(player.settings.wpm).toBe(350);
    });

    it("changes speed by delta and clamps", () => {
      const player = new Player({ ...DEFAULT_SETTINGS, wpm: 300 });

      player.changeSpeed(25);
      expect(player.settings.wpm).toBe(325);

      player.changeSpeed(-50);
      expect(player.settings.wpm).toBe(275);

      player.changeSpeed(1000);
      expect(player.settings.wpm).toBe(WPM_MAX);

      player.changeSpeed(-2000);
      expect(player.settings.wpm).toBe(WPM_MIN);
    });
  });

  describe("dispose", () => {
    it("stops timers and cancels further playback", () => {
      const player = new Player({
        ...DEFAULT_SETTINGS,
        wpm: 600,
        easeIn: false,
      });
      player.load("one two three");
      player.play();

      expect(player.isPlaying).toBe(true);
      player.dispose();
      expect(player.isPlaying).toBe(false);

      vi.advanceTimersByTime(5000);
      expect(player.index).toBe(0);
    });
  });

  describe("derived fields", () => {
    it("calculates current and remainingMinutes correctly", () => {
      const player = new Player({ ...DEFAULT_SETTINGS, wpm: 300 });
      expect(player.current).toBeUndefined();
      expect(player.remainingMinutes).toBe(0);

      player.load("one two three four"); // 4 tokens
      expect(player.current?.text).toBe("one");
      // remaining: max(0, 4 - 0 - 1) / 300 = 3 / 300 = 0.01 mins
      expect(player.remainingMinutes).toBeCloseTo(3 / 300);

      player.jumpTo(2);
      expect(player.current?.text).toBe("three");
      // remaining: max(0, 4 - 2 - 1) / 300 = 1 / 300
      expect(player.remainingMinutes).toBeCloseTo(1 / 300);

      player.jumpTo(3); // last token
      expect(player.current?.text).toBe("four");
      // remaining: max(0, 4 - 3 - 1) / 300 = 0
      expect(player.remainingMinutes).toBe(0);
    });
  });
});
