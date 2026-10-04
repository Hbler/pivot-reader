import type { Player } from "./player.svelte.ts";

export type Action =
  | "toggle"
  | "wordBack"
  | "wordForward"
  | "sentenceBack"
  | "sentenceForward"
  | "slower"
  | "faster";

export type KeyInput = {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: "text" | "range" | "button" | "other";
};

export const SPEED_STEP = 25;

export function actionForKey(e: KeyInput): Action | null {
  if (e.metaKey || e.ctrlKey || e.altKey) {
    return null;
  }

  if (e.target === "text") {
    return null;
  }

  if (e.key === " ") {
    if (e.target === "button") {
      return null;
    }
    return "toggle";
  }

  if (e.target === "range") {
    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      return null;
    }
  }

  if (e.key === "ArrowLeft") {
    return e.shiftKey ? "sentenceBack" : "wordBack";
  }

  if (e.key === "ArrowRight") {
    return e.shiftKey ? "sentenceForward" : "wordForward";
  }

  if (e.key === "ArrowUp") {
    return "faster";
  }

  if (e.key === "ArrowDown") {
    return "slower";
  }

  return null;
}

export function runAction(player: Player, action: Action): void {
  switch (action) {
    case "toggle":
      player.toggle();
      break;
    case "wordBack":
      player.stepWord(-1);
      break;
    case "wordForward":
      player.stepWord(1);
      break;
    case "sentenceBack":
      player.stepSentence(-1);
      break;
    case "sentenceForward":
      player.stepSentence(1);
      break;
    case "slower":
      player.changeSpeed(-SPEED_STEP);
      break;
    case "faster":
      player.changeSpeed(SPEED_STEP);
      break;
  }
}

export function formatTimeLeft(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")} left`;
}
