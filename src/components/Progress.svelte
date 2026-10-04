<script lang="ts">
  import type { Player } from "../lib/reader/player.svelte.ts";
  import { formatTimeLeft } from "../lib/reader/shortcuts.ts";

  let { player }: { player: Player } = $props();

  const max = $derived(Math.max(0, player.tokens.length - 1));
  const posText = $derived(
    player.tokens.length === 0
      ? "0 / 0"
      : `${player.index + 1} / ${player.tokens.length}`,
  );
  const timeText = $derived(
    player.tokens.length === 0
      ? "0:00 left"
      : formatTimeLeft(player.remainingMinutes),
  );
</script>

<div class="progress">
  <input
    type="range"
    id="scrub"
    aria-label="Position in text"
    min="0"
    {max}
    value={player.index}
    oninput={(e) => player.jumpTo(Number(e.currentTarget.value))}
  />
  <div class="progress-meta">
    <span>{posText}</span>
    <span>{timeText}</span>
  </div>
</div>

<style>
  .progress {
    display: grid;
    gap: 6px;
  }

  input[type="range"] {
    width: 100%;
    accent-color: var(--pivot);
    cursor: pointer;
  }

  .progress-meta {
    display: flex;
    justify-content: space-between;
    font: 0.75rem var(--f-num);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
