<script lang="ts">
  import type { Player } from "../lib/reader/player.svelte.ts";
  import { splitAtPivot } from "../lib/reader/pivot.ts";

  let { player }: { player: Player } = $props();

  const parts = $derived(splitAtPivot(player.current?.text ?? ""));
  const left = $derived(parts[0]);
  const pivot = $derived(parts[1]);
  const right = $derived(parts[2]);

  const side = $derived(
    Math.max(Array.from(left).length, Array.from(right).length) + 1,
  );

  const hintText = $derived.by(() => {
    if (player.tokens.length === 0) {
      return "Paste a text below to start";
    }
    if (player.finished) {
      return "Finished. Tap or press space to read again";
    }
    if (player.index === 0) {
      return "Tap or press space to start";
    }
    return "Paused. Tap or press space to resume";
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      player.toggle();
    }
  }
</script>

<div
  class="stage"
  role="button"
  tabindex="0"
  aria-label="Play or pause"
  onclick={() => player.toggle()}
  onkeydown={handleKeyDown}
>
  <div class="rule top"></div>
  <div class="rule bot"></div>
  <div class="word" style="--side: {side};" aria-live="off">
    <span class="l">{left}</span><span class="p">{pivot}</span><span class="r"
      >{right}</span
    >
  </div>
  <div class="hint" hidden={player.isPlaying}>{hintText}</div>
</div>

<style>
  .stage {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
    height: 200px;
    display: grid;
    align-items: center;
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    container-type: inline-size;
  }

  .stage::before,
  .stage::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 2px;
    height: 22px;
    background: var(--ink);
    opacity: 0.55;
    transform: translateX(-1px);
  }

  .stage::before {
    top: 34px;
  }

  .stage::after {
    bottom: 34px;
  }

  .rule {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--line);
  }

  .rule.top {
    top: 34px;
  }

  .rule.bot {
    bottom: 34px;
  }

  .word {
    --word-size: clamp(2rem, 7vw, 3.1rem);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: baseline;
    font-family: var(--f-word);
    font-weight: 400;
    line-height: 1;
    font-size: min(var(--word-size), calc(46cqw / (var(--side) * 0.62)));
  }

  .word span {
    white-space: pre;
  }

  .word .l {
    justify-self: end;
  }

  .word .p {
    color: var(--pivot);
    font-weight: 500;
  }

  .word .r {
    justify-self: start;
  }

  .hint {
    position: absolute;
    bottom: 8px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .hint[hidden] {
    display: none;
  }
</style>
