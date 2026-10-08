# Pivot Reader

A personal speed reader that shows one word at a time with a fixed, highlighted focus letter.

Live: https://hbler.github.io/pivot-reader/

## Overview

Pivot Reader uses rapid serial visual presentation (RSVP). Each word is shown in the same spot, with one letter (the pivot, slightly left of centre) highlighted and always kept at the same screen position. Your eyes stay still and the text comes to you, at a speed you set and raise over time.

It exists because apps like Readmaxx keep the useful part behind a very limited free tier, while the technique itself is simple. Everything runs in the browser and texts never leave the device.

It reads pasted text and opens `.txt`, Markdown (including Obsidian notes), EPUB and PDF files from your device, and remembers the current document with its title, position, speed and options. A library of documents is next on the roadmap; Chinese support is planned later.

## Tech Stack

- **Language**: TypeScript
- **Framework**: Svelte 5, built with Vite
- **Storage**: `localStorage` (settings), IndexedDB (library, once it exists)
- **Key Dependencies**: marked, JSZip and pdf.js (each loaded only when importing that file type); vite-plugin-pwa planned for offline
- **Hosting**: GitHub Pages, deployed by GitHub Actions on push to `main`

## Getting Started

```sh
npm install
npm run dev      # local dev server
npm test         # Vitest, reading logic only
npm run check    # svelte-check + type check
npm run build    # production build into dist/
```

## Project Structure

```
src/
  lib/reader/     pure TypeScript reading logic (no Svelte): tokenizing, pivot, timing, sentences
  lib/storage/    persistence wrappers (localStorage now, IndexedDB later)
  components/     Svelte UI components
  App.svelte
docs/
  ARCHITECTURE.md
  CONVENTIONS.md  (Norms)
  SAFEGUARDS.md
  features/<name>/CANVAS.md   one REASONS canvas per feature
prototype/
  pivot-reader.html           the original single-file prototype, kept as reference
```

## Roadmap

Each item gets its own canvas in `docs/features/`.

1. **Reader core** (shipped): the prototype, ported to Svelte, with touch controls
2. **File import** (done): `.txt`, Markdown, EPUB, PDF
3. **Library**: multiple saved documents, each with its own position
4. **Offline**: installable PWA
5. **Chinese**: word segmentation and a pivot rule for Hanzi

## License

Personal project, no license.
