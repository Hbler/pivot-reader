<script lang="ts">
  import type { Player } from "../lib/reader/player.svelte.ts";
  import {
    importFile,
    ImportError,
    type ImportedDocument,
    type ImportProgress,
  } from "../lib/import/index.ts";

  let {
    player,
    text,
    onLoad,
    onImport,
  }: {
    player: Player;
    text: string;
    onLoad: (newText: string) => boolean;
    onImport: (doc: ImportedDocument) => boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let draft = $state(text);
  let status = $state("");
  let isError = $state(false);
  let isDragging = $state(false);
  let isOpen = $state(false);

  let currentController: AbortController | null = null;

  const STORAGE_NOTE =
    "Too large to remember: this document won't survive a reload.";

  $effect(() => {
    draft = text;
  });

  function handleLoad() {
    if (currentController) {
      currentController.abort();
    }
    const saved = onLoad(draft);
    if (!saved) {
      status = STORAGE_NOTE;
      isError = false;
    } else {
      status = "";
      isError = false;
    }
    const stage = document.querySelector<HTMLElement>(".stage");
    stage?.focus();
  }

  function isPdf(file: File): boolean {
    return (
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/pdf"
    );
  }

  function getErrorMessage(err: unknown, file: File): string {
    if (err instanceof ImportError) {
      switch (err.kind) {
        case "unsupported":
          return "Pivot Reader can open .txt, .md, .epub and .pdf files.";
        case "drm":
          return "This EPUB is copy-protected (DRM), so its text can't be read.";
        case "damaged":
          return "This file couldn't be read. It may be damaged.";
        case "password":
          return "This PDF is password-protected.";
        case "no-text":
          return isPdf(file)
            ? "This PDF has no selectable text (it's probably a scan), so there's nothing to read."
            : "This file has no text to read.";
      }
    }
    return "This file couldn't be read. It may be damaged.";
  }

  async function startImport(file: File) {
    if (currentController) {
      currentController.abort();
    }
    const controller = new AbortController();
    currentController = controller;

    player.pause();
    status = `Opening ${file.name}…`;
    isError = false;

    try {
      const doc = await importFile(
        file,
        (p: ImportProgress) => {
          if (controller === currentController) {
            status = `Reading ${p.unit} ${p.done} of ${p.total}`;
            isError = false;
          }
        },
        controller.signal,
      );

      if (controller !== currentController) {
        return;
      }

      const saved = onImport(doc);
      status = saved ? `Opened “${doc.title}”.` : STORAGE_NOTE;
      isError = false;
      const stage = document.querySelector<HTMLElement>(".stage");
      stage?.focus();
    } catch (err: unknown) {
      if (
        controller !== currentController ||
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" &&
          err instanceof DOMException &&
          err.name === "AbortError")
      ) {
        return;
      }
      status = getErrorMessage(err, file);
      isError = true;
    }
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      startImport(file);
    }
    input.value = "";
  }

  function handleDragOver(event: DragEvent) {
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
      isDragging = true;
    }
  }

  function handleDragLeave(event: DragEvent) {
    const current = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (current && related && current.contains(related)) {
      return;
    }
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    isOpen = true;
    const details = event.currentTarget as HTMLDetailsElement;
    if (details) {
      details.open = true;
    }
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      startImport(file);
    }
  }
</script>

<details
  id="textPanel"
  class:highlighted={isDragging}
  bind:open={isOpen}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
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
      <label class="button-like">
        Open file…
        <input
          type="file"
          id="file"
          accept=".txt,.md,.markdown,.epub,.pdf,text/plain,text/markdown,application/epub+zip,application/pdf"
          onchange={handleFileChange}
        />
      </label>
    </div>
    <p role="status" aria-live="polite" class="status" class:error={isError}>
      {status}
    </p>
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

  details.highlighted {
    outline: 2px dashed var(--pivot);
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

  button,
  .button-like {
    font: 500 0.875rem var(--f-ui);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
    min-height: 44px;
    padding: 8px 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    user-select: none;
  }

  button:hover,
  .button-like:hover {
    border-color: var(--muted);
  }

  .button-like:focus-within {
    outline: 2px solid var(--pivot);
    outline-offset: 2px;
  }

  .button-like input[type="file"] {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
    opacity: 0;
  }

  .status {
    margin: 0;
    font: 0.8rem var(--f-ui);
    color: var(--muted);
  }

  .status:empty {
    display: none;
  }

  .status.error {
    color: var(--pivot);
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
