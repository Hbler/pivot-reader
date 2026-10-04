import { describe, expect, it } from "vitest";
import { Player } from "./player.svelte.ts";
import {
  actionForKey,
  formatTimeLeft,
  runAction,
  SPEED_STEP,
  type KeyInput,
} from "./shortcuts.ts";

function keyInput(overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    key: " ",
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: "other",
    ...overrides,
  };
}

describe("actionForKey", () => {
  describe("modifier keys", () => {
    it("returns null when metaKey is held", () => {
      expect(actionForKey(keyInput({ key: " ", metaKey: true }))).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowLeft", metaKey: true })),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowUp", metaKey: true })),
      ).toBeNull();
    });

    it("returns null when ctrlKey is held", () => {
      expect(actionForKey(keyInput({ key: " ", ctrlKey: true }))).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowRight", ctrlKey: true })),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowDown", ctrlKey: true })),
      ).toBeNull();
    });

    it("returns null when altKey is held", () => {
      expect(actionForKey(keyInput({ key: " ", altKey: true }))).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowLeft", altKey: true })),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowDown", altKey: true })),
      ).toBeNull();
    });
  });

  describe("text target", () => {
    it("returns null for all shortcuts when target is text", () => {
      expect(actionForKey(keyInput({ key: " ", target: "text" }))).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowLeft", target: "text" })),
      ).toBeNull();
      expect(
        actionForKey(
          keyInput({ key: "ArrowLeft", shiftKey: true, target: "text" }),
        ),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowRight", target: "text" })),
      ).toBeNull();
      expect(
        actionForKey(
          keyInput({ key: "ArrowRight", shiftKey: true, target: "text" }),
        ),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowUp", target: "text" })),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowDown", target: "text" })),
      ).toBeNull();
    });
  });

  describe("space (toggle)", () => {
    it("returns toggle when target is other", () => {
      expect(actionForKey(keyInput({ key: " ", target: "other" }))).toBe(
        "toggle",
      );
    });

    it("returns toggle when target is range", () => {
      expect(actionForKey(keyInput({ key: " ", target: "range" }))).toBe(
        "toggle",
      );
    });

    it("returns null when target is button so button click handles it", () => {
      expect(actionForKey(keyInput({ key: " ", target: "button" }))).toBeNull();
    });
  });

  describe("arrow keys navigation", () => {
    it("maps ArrowLeft to wordBack and with shift to sentenceBack", () => {
      expect(
        actionForKey(keyInput({ key: "ArrowLeft", shiftKey: false })),
      ).toBe("wordBack");
      expect(actionForKey(keyInput({ key: "ArrowLeft", shiftKey: true }))).toBe(
        "sentenceBack",
      );
    });

    it("maps ArrowRight to wordForward and with shift to sentenceForward", () => {
      expect(
        actionForKey(keyInput({ key: "ArrowRight", shiftKey: false })),
      ).toBe("wordForward");
      expect(
        actionForKey(keyInput({ key: "ArrowRight", shiftKey: true })),
      ).toBe("sentenceForward");
    });

    it("returns null for ArrowLeft and ArrowRight when target is range", () => {
      expect(
        actionForKey(
          keyInput({ key: "ArrowLeft", shiftKey: false, target: "range" }),
        ),
      ).toBeNull();
      expect(
        actionForKey(
          keyInput({ key: "ArrowLeft", shiftKey: true, target: "range" }),
        ),
      ).toBeNull();
      expect(
        actionForKey(
          keyInput({ key: "ArrowRight", shiftKey: false, target: "range" }),
        ),
      ).toBeNull();
      expect(
        actionForKey(
          keyInput({ key: "ArrowRight", shiftKey: true, target: "range" }),
        ),
      ).toBeNull();
    });

    it("works when target is button", () => {
      expect(
        actionForKey(
          keyInput({ key: "ArrowLeft", shiftKey: false, target: "button" }),
        ),
      ).toBe("wordBack");
      expect(
        actionForKey(
          keyInput({ key: "ArrowRight", shiftKey: true, target: "button" }),
        ),
      ).toBe("sentenceForward");
    });
  });

  describe("arrow keys speed", () => {
    it("maps ArrowUp to faster and ArrowDown to slower", () => {
      expect(actionForKey(keyInput({ key: "ArrowUp" }))).toBe("faster");
      expect(actionForKey(keyInput({ key: "ArrowDown" }))).toBe("slower");
    });

    it("returns null for ArrowUp and ArrowDown when target is range", () => {
      expect(
        actionForKey(keyInput({ key: "ArrowUp", target: "range" })),
      ).toBeNull();
      expect(
        actionForKey(keyInput({ key: "ArrowDown", target: "range" })),
      ).toBeNull();
    });
  });

  describe("unmapped keys", () => {
    it("returns null for unmapped keys", () => {
      expect(actionForKey(keyInput({ key: "Enter" }))).toBeNull();
      expect(actionForKey(keyInput({ key: "Escape" }))).toBeNull();
      expect(actionForKey(keyInput({ key: "Tab" }))).toBeNull();
      expect(actionForKey(keyInput({ key: "a" }))).toBeNull();
      expect(actionForKey(keyInput({ key: "1" }))).toBeNull();
    });
  });
});

describe("formatTimeLeft", () => {
  it("formats 0 as '0:00 left'", () => {
    expect(formatTimeLeft(0)).toBe("0:00 left");
  });

  it("formats 0.5 as '0:30 left'", () => {
    expect(formatTimeLeft(0.5)).toBe("0:30 left");
  });

  it("formats 1.999 as '2:00 left' and never ':60'", () => {
    expect(formatTimeLeft(1.999)).toBe("2:00 left");
    expect(formatTimeLeft(1.999)).not.toContain(":60");
  });

  it("formats 12.25 as '12:15 left'", () => {
    expect(formatTimeLeft(12.25)).toBe("12:15 left");
  });

  it("handles negative minutes cleanly by clamping to 0", () => {
    expect(formatTimeLeft(-1)).toBe("0:00 left");
  });
});

describe("runAction", () => {
  it("executes toggle on player", () => {
    const player = new Player();
    player.load("First sentence. Second sentence. Third word.");
    expect(player.isPlaying).toBe(false);

    runAction(player, "toggle");
    expect(player.isPlaying).toBe(true);

    runAction(player, "toggle");
    expect(player.isPlaying).toBe(false);
  });

  it("executes wordForward and wordBack on player", () => {
    const player = new Player();
    player.load("First sentence. Second sentence. Third word.");
    expect(player.index).toBe(0);

    runAction(player, "wordForward");
    expect(player.index).toBe(1);

    runAction(player, "wordBack");
    expect(player.index).toBe(0);
  });

  it("executes sentenceForward and sentenceBack on player", () => {
    const player = new Player();
    // Tokens: ["First", "sentence.", "Second", "sentence.", "Third", "word."]
    player.load("First sentence. Second sentence. Third word.");
    expect(player.index).toBe(0);

    runAction(player, "sentenceForward");
    expect(player.index).toBe(2);

    runAction(player, "sentenceBack");
    expect(player.index).toBe(0);
  });

  it("executes faster and slower adjusting speed by SPEED_STEP", () => {
    const player = new Player();
    player.load("Some sample text.");
    const initialWpm = player.settings.wpm;

    runAction(player, "faster");
    expect(player.settings.wpm).toBe(initialWpm + SPEED_STEP);

    runAction(player, "slower");
    expect(player.settings.wpm).toBe(initialWpm);

    runAction(player, "slower");
    expect(player.settings.wpm).toBe(initialWpm - SPEED_STEP);
  });
});
