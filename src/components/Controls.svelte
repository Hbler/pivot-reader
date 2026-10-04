<script lang="ts">
  import type { Player } from "../lib/reader/player.svelte.ts";
  import { runAction, type Action } from "../lib/reader/shortcuts.ts";

  let { player }: { player: Player } = $props();

  function press(
    event: MouseEvent & { currentTarget: HTMLButtonElement },
    action: Action,
  ) {
    runAction(player, action);
    if (event.detail > 0) {
      event.currentTarget.blur();
    }
  }
</script>

<div class="controls">
  <div class="nav-row">
    <button
      type="button"
      class="icon-btn"
      aria-label="Back one sentence"
      title="Back one sentence (Shift+←)"
      onclick={(e) => press(e, "sentenceBack")}
    >
      «
    </button>
    <button
      type="button"
      class="icon-btn"
      aria-label="Back one word"
      title="Back one word (←)"
      onclick={(e) => press(e, "wordBack")}
    >
      ‹
    </button>
    <button
      type="button"
      class="primary"
      title="{player.isPlaying ? 'Pause' : 'Play'} (Space)"
      onclick={(e) => press(e, "toggle")}
    >
      {player.isPlaying ? "Pause" : "Play"}
    </button>
    <button
      type="button"
      class="icon-btn"
      aria-label="Forward one word"
      title="Forward one word (→)"
      onclick={(e) => press(e, "wordForward")}
    >
      ›
    </button>
    <button
      type="button"
      class="icon-btn"
      aria-label="Forward one sentence"
      title="Forward one sentence (Shift+→)"
      onclick={(e) => press(e, "sentenceForward")}
    >
      »
    </button>
  </div>

  <div class="speed-row">
    <label for="wpm">Speed</label>
    <button
      type="button"
      class="icon-btn"
      aria-label="Slower"
      title="Slower (↓)"
      onclick={(e) => press(e, "slower")}
    >
      −
    </button>
    <input
      type="range"
      id="wpm"
      min="100"
      max="1000"
      step="10"
      value={player.settings.wpm}
      oninput={(e) => player.setWpm(Number(e.currentTarget.value))}
    />
    <button
      type="button"
      class="icon-btn"
      aria-label="Faster"
      title="Faster (↑)"
      onclick={(e) => press(e, "faster")}
    >
      +
    </button>
    <output for="wpm">{player.settings.wpm} wpm</output>
  </div>
</div>

<style>
  .controls {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .nav-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .speed-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 260px;
    flex-wrap: wrap;
  }

  button {
    font: 500 0.875rem var(--f-ui);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
    min-width: 44px;
    min-height: 44px;
    padding: 8px 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    box-sizing: border-box;
  }

  button:hover {
    border-color: var(--muted);
  }

  button.primary {
    background: var(--ink);
    color: var(--surface);
    border-color: var(--ink);
    min-width: 92px;
  }

  button.primary:hover {
    opacity: 0.9;
  }

  .icon-btn {
    font-size: 1.15rem;
    line-height: 1;
    padding: 0;
  }

  label {
    font-size: 0.8rem;
    color: var(--muted);
    white-space: nowrap;
  }

  input[type="range"] {
    flex: 1 1 60px;
    min-width: 50px;
    accent-color: var(--pivot);
    cursor: pointer;
  }

  output {
    font: 500 0.9rem var(--f-num);
    min-width: 72px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
</style>
