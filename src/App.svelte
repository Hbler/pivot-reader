<script lang="ts">
  import { Player } from "./lib/reader/player.svelte.ts";
  import { SAMPLE_TEXT } from "./lib/sample-text.ts";
  import Stage from "./components/Stage.svelte";
  import Progress from "./components/Progress.svelte";
  import Controls from "./components/Controls.svelte";
  import Context from "./components/Context.svelte";
  import TextPanel from "./components/TextPanel.svelte";
  import { loadValue, saveValue } from "./lib/storage/local.ts";
  import { sanitizeSettings } from "./lib/storage/validate.ts";
  import {
    actionForKey,
    runAction,
    type KeyInput,
  } from "./lib/reader/shortcuts.ts";

  const storedText = loadValue<unknown>("text");
  const storedTitle = loadValue<unknown>("title");
  const initialText = typeof storedText === "string" ? storedText : SAMPLE_TEXT;
  const initialTitle =
    typeof storedTitle === "string" && storedTitle.length > 0
      ? storedTitle
      : typeof storedText === "string"
        ? "Pasted text"
        : "Sample text";
  let text = $state(initialText);
  let title = $state(initialTitle);
  const settings = sanitizeSettings(loadValue("settings"));

  const player = new Player(settings);
  player.load(initialText, loadValue("position"));

  function loadDocument(newText: string, newTitle: string): boolean {
    text = newText;
    title = newTitle;
    player.load(newText, 0);
    const saved = saveValue("text", newText);
    if (saved) {
      saveValue("title", newTitle);
    } else {
      saveValue("text", null);
      saveValue("title", null);
    }
    saveValue("position", 0);
    return saved;
  }

  $effect(() => {
    saveValue("settings", $state.snapshot(player.settings));
  });

  $effect(() => {
    saveValue("position", player.index);
  });

  $effect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        player.pause();
      }
    }

    function handlePageHide() {
      player.pause();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
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
    <div class="stats">
      <span class="title" {title}>{title}</span>
      <span class="count">
        · {player.tokens.length.toLocaleString()} words</span
      >
    </div>
  </header>
  <Stage {player} />
  <Progress {player} />
  <Controls {player} />
  <Context {player} />
  <TextPanel
    {player}
    {text}
    onLoad={(t) => loadDocument(t, "Pasted text")}
    onImport={(doc) => loadDocument(doc.text, doc.title)}
  />
</div>

<style>
  header {
    min-width: 0;
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
    display: flex;
    align-items: baseline;
    min-width: 0;
    max-width: 100%;
    font: 400 0.8rem var(--f-num);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .count {
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>
