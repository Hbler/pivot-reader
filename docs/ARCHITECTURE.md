# Architecture Overview

## System Diagram

```
 text source ──► tokenize() ──► Token[] ──► Player ──► UI components
 (paste / file)                    │          │  ▲
                                   │          │  └── user input (keys, buttons, taps)
                                   ▼          ▼
                              pivotIndex()  delayFor()
                                              │
                                   storage ◄──┘ (position, speed, options)
```

Everything runs in the browser. There is no server.

## Components

### Reading logic (`src/lib/reader/`)

- **Purpose**: the RSVP rules, independent of any UI.
- **Responsibilities**: split text into tokens; find a token's pivot letter; compute each token's display time; find sentence bounds.
- **Dependencies**: none.

### Player

- **Purpose**: playback state machine.
- **Responsibilities**: current index, playing/paused, scheduling the next token, stepping by word/sentence, speed changes.
- **Dependencies**: reading logic, storage.

### UI (`src/components/`)

- **Purpose**: show the current word and expose every control by keyboard and by button.
- **Dependencies**: Player.

### Importers (`src/lib/import/`)

- **Purpose**: turn a local file into plain text and a title.
- **Responsibilities**: `importFile` picks the importer; txt, Markdown (marked), EPUB (JSZip) and PDF (pdf.js, worker bundled locally) each load only when needed. Shared `htmlToText` for EPUB and Markdown; pure PDF line/paragraph rules in `pdf-text.ts`.
- **Dependencies**: none at app start; each importer's library is a separate chunk.

### Storage (`src/lib/storage/`)

- **Purpose**: remember settings and reading position.
- **Responsibilities**: safe `localStorage` access now; IndexedDB library later.

## Domain Model

- **Document**: a source text with a title (pasted text is "Pasted text"; imported files use their own title). Until the Library feature, there is exactly one.
- **ImportedDocument**: `{ title, text, source }` produced by an importer from a `.txt`, Markdown, EPUB or PDF file (see `docs/features/file-import/CANVAS.md`).
- **Token**: `{ text, sentenceEnd, paragraphEnd }`, produced from a Document.
- **Position**: index of the current Token in a Document.
- **Settings**: WPM (100–1000), punctuation pauses, long-word slowdown, ease-in.

Document 1 ─ * Token. Position belongs to a Document. Settings are global.

## Data Flow

Text → `tokenize` → Token[] held by the Player. On each tick the Player shows token _i_, waits `delayFor(token)`, advances. Position and settings are written to storage on change; on load the last Document and Position are restored.

## Design Decisions

### Pure-logic core

- **Context**: Chinese support needs different tokenizing and pivot rules.
- **Decision**: keep reading rules as pure functions behind small interfaces.
- **Consequences**: easy to unit test and to swap per language; slightly more files than a single component.

### Fixed pivot by CSS grid

- **Context**: the pivot must never move; measuring text in JS is fragile.
- **Decision**: render left / pivot / right in a `minmax(0, 1fr) auto minmax(0, 1fr)` grid; left part right-aligned, right part left-aligned. Words whose longer side wouldn't fit half the stage get a smaller font size (computed from character count with container query units), so a side never overflows and pushes the pivot.
- **Consequences**: exact alignment in any proportional font, no measuring.

### Self-hosted fonts

- **Context**: offline use and no third-party requests.
- **Decision**: bundle fonts via `@fontsource` instead of Google Fonts.
- **Consequences**: fonts count toward the build size; subset to Latin.

## Security Model

No accounts and no network calls with user content. All data lives in the browser's storage on the device.
