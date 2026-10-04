# REASONS Canvas: Reader Core

**Status**: approved (R/E/A/S 2026-10-04)
**Last synced with code**: O1, O2, O3 (2026-10-04)

---

## R — Requirements

Port the prototype (`prototype/pivot-reader.html`) to Vite + TypeScript + Svelte 5 with the same behaviour, and add on-screen controls for every keyboard shortcut so it works fully on a phone. This is the foundation every later feature builds on.

### User Stories

- As the reader, I want to paste a text and read it one word at a time at a speed I choose, so that I read with more focus and can train speed.
- As the reader on a phone, I want buttons for everything the keyboard does, so that I'm not missing controls without a keyboard.
- As the reader, I want to pick up where I left off, so that closing the page costs nothing.

### Definition of Done

- [ ] Each word shows with its pivot letter highlighted and at a fixed screen position (Safeguard invariant)
- [ ] Speed adjustable 100–1000 WPM in steps of 10 (slider) and 25 (shortcuts/buttons)
- [ ] Longer pauses at commas, sentence ends and paragraph ends; slower long words; ease-in after play — each toggleable
- [ ] Play/pause by click/tap on the stage, button and Space
- [ ] Step one word back/forward: ←/→ and buttons
- [ ] Step one sentence back/forward: Shift+←/→ and buttons
- [ ] Speed −/+25: ↓/↑ and buttons
- [ ] Progress bar is draggable and shows word count and time left
- [ ] When paused, the current sentence shows below the stage; clicking a word jumps there
- [ ] Text panel: paste text, "Read this text" loads it
- [ ] Text, position, WPM and options persist across reloads
- [ ] Light and dark themes following the system
- [ ] Usable at 360px width; touch targets ≥ 44px
- [ ] Deployed to GitHub Pages from `main`

### Edge Cases

| Scenario                                           | Expected Behavior                                       |
| -------------------------------------------------- | ------------------------------------------------------- |
| Empty text loaded                                  | Stage shows a prompt to add text; play does nothing     |
| Restored position beyond end of text               | Clamp to last word                                      |
| Word with leading/trailing punctuation (`"Hello,`) | Pivot chosen from letters only; punctuation still shown |
| Accented letters stored decomposed (`e` + combining `◌́`) | Normalized to composed form first; the accent stays on its letter and is never split from it |
| Word too wide for the stage on either side of the pivot (at 360px, roughly 10+ letters after the pivot) | Shown whole at a smaller size so both sides fit; pivot stays fixed |
| Playback reaches the end                           | Pause on last word; play restarts from the beginning    |
| Page hidden while playing                          | Pause and save position                                 |
| Storage unavailable                                | App works; nothing persists                             |
| Key pressed while typing in the text panel         | Ignored by shortcuts                                    |

### Out of Scope

- File import (`.txt`, EPUB, PDF) — `file-import` canvas. The prototype's `.txt` picker is dropped here and returns there.
- Multiple documents — `library` canvas
- Offline/PWA — `offline` canvas
- Chinese — `chinese` canvas

## E — Entities

See [ARCHITECTURE.md › Domain Model](../../ARCHITECTURE.md#domain-model).

### Token

| Field        | Type    | Description                                                       |
| ------------ | ------- | ----------------------------------------------------------------- |
| text         | string  | The word as displayed, with attached punctuation                  |
| sentenceEnd  | boolean | Ends in `. ! ? …`, optionally followed by closing quotes/brackets |
| paragraphEnd | boolean | Last token before a blank line or end of text                     |

### Settings

| Field             | Type    | Description           |
| ----------------- | ------- | --------------------- |
| wpm               | number  | 100–1000, default 300 |
| punctuationPauses | boolean | default true          |
| longWordSlowdown  | boolean | default true          |
| easeIn            | boolean | default true          |

### Saved state (until Library)

| Key      | Type     | Description                     |
| -------- | -------- | ------------------------------- |
| text     | string   | The current document's raw text |
| position | number   | Current token index             |
| settings | Settings | As above                        |

### Relationships

- Document text → Token[] (derived, never stored)
- Position indexes into Token[]

## A — Approach

Port behaviour exactly from the prototype, restructured into pure logic + Player + components.

### Rules (from the prototype)

- **Pivot**: count letters/digits only (Unicode-aware). Length 1 → 1st, 2–5 → 2nd, 6–9 → 3rd, 10–13 → 4th, 14+ → 5th letter, offset by any leading punctuation.
- **Timing**: base = 60000 / WPM ms, multiplied by `1 +` the extras below:
  - long words: +0.3 if > 8 letters, another +0.3 if > 12
  - paragraph end +1.6, else sentence end +1.1, else trailing `, ; : — –` +0.5
  - ease-in: the first 4 tokens after play are multiplied by 2.0, 1.75, 1.5, 1.25
- **Tokenizing**: normalize the text to Unicode NFC, then split on blank lines into paragraphs, then on whitespace.
- **Fixed pivot**: `minmax(0, 1fr) auto minmax(0, 1fr)` grid (plain `1fr` lets a long side widen its column and move the pivot). The stage is a size container; the word's font size is the smaller of the normal size and the size at which its longer side (in characters) fits half the stage width, so no side ever overflows.
- **Playback**: chained `setTimeout`, one per token.

### Touch controls

One control row under the stage: `‹‹ sentence` `‹ word` **Play/Pause** `word ›` `sentence ››`, plus `−` / `+` beside the speed slider. Always visible on every device, so there is one layout and the keyboard is just a shortcut. The keyboard-shortcut list stays in the text panel.

### Alternatives Considered

- Tap zones on the stage (left = back, right = forward): rejected for now. They're hidden and easy to trigger by accident; can be added later on top of the buttons.
- Split long words (13+ letters) into hyphenated chunks shown in turn, as Spritz does: deferred (2026-10-04). On a 360px phone, shrinking takes a 20-letter word to ~13px and a 28-letter word to ~10px; the user chose to live with that for now. Revisit if long words are hard to read on the phone. Sketch if revisited: prefer existing hyphens, else even chunks of ≤ 10 letters; punctuation stays with the whole word; only the last chunk carries sentence/paragraph end; tokens gain `part`/`partCount` so word counts and the paused sentence show whole words; shrinking stays as the safety net.
- Show touch controls only on touch devices: rejected. Detecting touch is unreliable and two layouts double the testing.

## S — Structure

- **Adds**:
  - `src/lib/reader/tokenize.ts` — `tokenize(text): Token[]`
  - `src/lib/reader/pivot.ts` — `pivotIndex(word): number`, `splitAtPivot(word): [left, pivot, right]`
  - `src/lib/reader/timing.ts` — `delayFor(token, settings, easeInStep): number`
  - `src/lib/reader/sentence.ts` — `sentenceBounds(tokens, i): [start, end]`
  - `src/lib/reader/player.svelte.ts` — `Player` class with runes state
  - `src/lib/storage/local.ts` — safe get/set with key prefix `pivot:`
  - `src/components/` — `Stage`, `Controls`, `Progress`, `Context`, `TextPanel`
  - `src/App.svelte`, `src/app.css` (theme tokens from the prototype)
  - Tooling: Vite, Svelte 5, TS, Vitest, Prettier, svelte-check, `@fontsource/literata`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`
  - `.github/workflows/deploy.yml` — build and deploy to Pages
- **Changes**: none (new codebase)
- **Depends on**: nothing at runtime beyond Svelte

### Interfaces

```ts
type Token = { text: string; sentenceEnd: boolean; paragraphEnd: boolean };
type Settings = {
  wpm: number;
  punctuationPauses: boolean;
  longWordSlowdown: boolean;
  easeIn: boolean;
};

class Player {
  tokens: Token[];
  index: number;
  isPlaying: boolean;
  settings: Settings;
  load(text: string, restorePosition?: number): void;
  play(): void;
  pause(): void;
  toggle(): void;
  stepWord(dir: -1 | 1): void;
  stepSentence(dir: -1 | 1): void;
  jumpTo(i: number): void;
  changeSpeed(delta: number): void;
}
```

---

## O — Operations

Concrete, testable steps, derived from R/E/A/S. Implement one at a time; each should be independently verifiable. Code is written by agy and reviewed before ticking.

- [x] **O1**: Scaffold Vite + Svelte 5 + TS (strict), Vitest, Prettier + svelte plugin, svelte-check, `@fontsource` fonts; `base` set for GitHub Pages; placeholder `App.svelte` — verify by: `npm test && npm run check && npm run build` pass
- [x] **O2**: Reading logic in `src/lib/reader/` (`tokenize`, `pivotIndex`/`splitAtPivot`, `delayFor`, `sentenceBounds`) ported from the prototype, with unit tests per rule in A — verify by: tests cover every pivot band, punctuation cases, each timing extra and ease-in step
- [x] **O2.1**: NFC-normalize text in `tokenize` (added after O2, see Change Log) — verify by: a decomposed `résumé` tokenizes to the composed word, and its pivot/split matches the composed one
- [x] **O3**: `src/lib/storage/local.ts` safe get/set with `pivot:` prefix, plus restored-state validation (clamp position, WPM range) — verify by: tests with working storage and storage that throws
- [x] **O4**: `Player` class in `player.svelte.ts` (load, play/pause/toggle, stepWord, stepSentence, jumpTo, changeSpeed, end-of-text and ease-in behaviour) — verify by: Vitest with fake timers
- [x] **O5**: `Stage.svelte` + `app.css` theme tokens: fixed-pivot grid, notches, hint, tap to toggle, long-word shrink — verify by: visual check at 360px and 1280px, pivot doesn't shift across short/long words, both themes
- [x] **O6**: `Controls.svelte` (touch row, speed slider with −/+) and `Progress.svelte` (scrubber, count, time left); keyboard shortcuts calling the same actions — verify by: every shortcut has a working button; targets ≥ 44px at 360px
- [ ] **O7**: `Context.svelte` (paused sentence, click to jump) and `TextPanel.svelte` (paste, load, option toggles, shortcut list); wire persistence, pause on page hide — verify by: reload restores text/position/WPM/options; empty-text and end-of-text edge cases behave as in R
- [ ] **O8**: `.github/workflows/deploy.yml` building and deploying to Pages — verify by: workflow runs green after the first push (needs a GitHub repo; user's call)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific additions:

- Unit tests port the prototype's behaviour: one test per pivot length band, punctuation cases and each timing multiplier.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific additions:

- Visual check at 360px and 1280px that the pivot doesn't shift between words of different lengths.

---

## Change Log

| Date       | Section | Change                                        | Reason                  |
| ---------- | ------- | --------------------------------------------- | ----------------------- |
| 2026-10-04 | R, A    | Added on-screen equivalents for all shortcuts | User request: phone use |
| 2026-10-04 | A       | Pivot counts Unicode code points, not UTF-16 units | Prototype could split an emoji or other astral character |
| 2026-10-04 | R, A, O | NFC-normalize text before tokenizing; new O2.1 | Decomposed accents (some pasted text and EPUBs) were counted as separate non-letters and could be split from their letter |
| 2026-10-04 | R, A    | Long-word shrink triggers when a side wouldn't fit, not at a fixed 20 chars; grid uses `minmax(0, 1fr)` | At 360px a 20-char limit lets words overflow, and overflow moves the pivot |
