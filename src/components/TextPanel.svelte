<script lang="ts">
  import type { Player } from "../lib/reader/player.svelte.ts";

  let {
    player,
    text,
    onLoad,
  }: {
    player: Player;
    text: string;
    onLoad: (newText: string) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let draft = $state(text);

  $effect(() => {
    draft = text;
  });

  function handleLoad() {
    onLoad(draft);
    const stage = document.querySelector<HTMLElement>(".stage");
    stage?.focus();
  }
</script>

<details id="textPanel">
  <summary>Text and settings</summary>
  <div class="panel">
    <textarea
      id="text"
      spellcheck="false"
      aria-label="Text to read"
      bind:value={draft}></textarea>
    <div class="row">
      <button type="button" id="load" onclick={handleLoad}>
        Read this text
      </button>
    </div>
    <div class="opts">
      <label>
        <input
          type="checkbox"
          id="optPause"
          bind:checked={player.settings.punctuationPauses}
        />
        Pause longer at punctuation
      </label>
      <label>
        <input
          type="checkbox"
          id="optLong"
          bind:checked={player.settings.longWordSlowdown}
        />
        Slow down for long words
      </label>
      <label>
        <input
          type="checkbox"
          id="optRamp"
          bind:checked={player.settings.easeIn}
        />
        Ease in after each pause
      </label>
    </div>
    <div class="keys">
      <span><kbd>Space</kbd> play / pause</span>
      <span><kbd>←</kbd><kbd>→</kbd> one word</span>
      <span><kbd>Shift</kbd>+<kbd>←</kbd><kbd>→</kbd> one sentence</span>
      <span><kbd>↑</kbd><kbd>↓</kbd> speed ±25</span>
    </div>
  </div>
</details>

<style>
  details {
    border-top: 1px solid var(--line);
    padding-top: 14px;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .panel {
    display: grid;
    gap: 12px;
    margin-top: 12px;
  }

  textarea {
    width: 100%;
    min-height: 220px;
    resize: vertical;
    padding: 12px;
    font: 0.95rem/1.55 var(--f-word);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  button {
    font: 500 0.875rem var(--f-ui);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
    min-height: 44px;
    padding: 8px 14px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--muted);
  }

  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    font-size: 0.85rem;
  }

  .opts label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .keys {
    font-size: 0.8rem;
    color: var(--muted);
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }

  kbd {
    font: 0.75rem var(--f-num);
    border: 1px solid var(--line);
    border-bottom-width: 2px;
    border-radius: 3px;
    padding: 0 5px;
    background: var(--surface);
    color: var(--ink);
  }
</style>
