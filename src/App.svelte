<script lang="ts">
  import { Player } from "./lib/reader/player.svelte.ts";
  import { SAMPLE_TEXT } from "./lib/sample-text.ts";
  import Stage from "./components/Stage.svelte";
  import Progress from "./components/Progress.svelte";
  import Controls from "./components/Controls.svelte";
  import {
    actionForKey,
    runAction,
    type KeyInput,
  } from "./lib/reader/shortcuts.ts";

  const player = new Player();
  player.load(SAMPLE_TEXT);

  $effect(() => {
    return () => {
      player.dispose();
    };
  });

  function getTargetKind(el: EventTarget | null): KeyInput["target"] {
    if (!(el instanceof HTMLElement)) return "other";
    if (
      el.tagName === "TEXTAREA" ||
      el.isContentEditable ||
      (el instanceof HTMLInputElement &&
        ["text", "search", "email", "url"].includes(el.type))
    ) {
      return "text";
    }
    if (el instanceof HTMLInputElement && el.type === "range") {
      return "range";
    }
    if (el.tagName === "BUTTON" || el.closest("button") !== null) {
      return "button";
    }
    return "other";
  }

  function handleKeyDown(event: KeyboardEvent) {
    const input: KeyInput = {
      key: event.key,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      target: getTargetKind(event.target),
    };
    const action = actionForKey(input);
    if (action) {
      event.preventDefault();
      runAction(player, action);
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="wrap">
  <header>
    <h1>Pivot <span>R</span>eader</h1>
    <div class="stats">{player.tokens.length.toLocaleString()} words</div>
  </header>
  <Stage {player} />
  <Progress {player} />
  <Controls {player} />
</div>

<style>
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  h1 {
    font: 500 1.35rem/1.2 var(--f-word);
    margin: 0;
    letter-spacing: -0.01em;
  }

  h1 span {
    color: var(--pivot);
  }

  .stats {
    font: 400 0.8rem var(--f-num);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
