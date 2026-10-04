<script lang="ts">
  import type { Player } from "../lib/reader/player.svelte.ts";
  import { sentenceBounds } from "../lib/reader/sentence.ts";

  let { player }: { player: Player } = $props();

  const words = $derived.by(() => {
    if (player.isPlaying || player.tokens.length === 0) {
      return [];
    }
    const [start, end] = sentenceBounds(player.tokens, player.index);
    if (start > end || start < 0) {
      return [];
    }
    const slice: { token: (typeof player.tokens)[number]; k: number }[] = [];
    for (let k = start; k <= end; k++) {
      slice.push({ token: player.tokens[k], k });
    }
    return slice;
  });

  function handleClick(
    event: MouseEvent & { currentTarget: HTMLButtonElement },
    k: number,
  ) {
    player.jumpTo(k);
    if (event.detail > 0) {
      event.currentTarget.blur();
    }
  }
</script>

<div class="context">
  {#if words.length > 0}
    <p>
      {#each words as { token, k }}
        <button
          type="button"
          class="w"
          class:current={k === player.index}
          aria-label="Jump to {token.text}"
          onclick={(e) => handleClick(e, k)}
          >{#if k === player.index}<mark>{token.text}</mark
            >{:else}{token.text}{/if}</button
        >{" "}
      {/each}
    </p>
  {/if}
</div>

<style>
  .context {
    font: 400 1rem/2.75 var(--f-word);
    color: var(--muted);
    max-width: 65ch;
    min-height: 5.5em;
  }

  p {
    margin: 0;
    font: inherit;
    color: inherit;
    line-height: inherit;
    max-width: inherit;
  }

  .w {
    display: inline;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    line-height: inherit;
    cursor: pointer;
  }

  .w:hover {
    color: var(--ink);
  }

  .w.current {
    color: var(--ink);
  }

  mark {
    background: var(--pivot-soft);
    color: var(--ink);
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
