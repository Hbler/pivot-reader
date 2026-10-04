# AI Assistant Instructions

## Project Overview

Pivot Reader is a personal RSVP speed reader: one word at a time, pivot letter highlighted and fixed on screen. Static Svelte app on GitHub Pages, no backend. Single user (the owner), used on desktop and phone. `prototype/pivot-reader.html` is the original single-file version and the behavioural reference for Reader core.

## How Features Are Built (SPDD)

Every feature has a REASONS canvas at `docs/features/{feature-name}/CANVAS.md`. The canvas is the source of truth; code is derived from it.

1. No code for a feature until its canvas exists and R/E/A/S are approved by the user.
2. Implement one Operation at a time; each Operation is a small, independently testable step. Tick it off in the canvas when done.
3. Every change must respect `docs/CONVENTIONS.md` (Norms) and `docs/SAFEGUARDS.md` (Safeguards).
4. **Drift rule:** if the code needs to differ from the canvas (new requirement, wrong approach, discovered edge case), stop, update the canvas first, get it approved, then change the code. Never silently patch code away from the canvas.
5. After a feature ships, sync the canvas with what was actually built so it stays accurate as documentation.

## Tech Stack & Conventions

- TypeScript strict, Svelte 5 runes (`$state`, `$derived`, `$effect`); no legacy stores or `export let`.
- Reading logic lives in `src/lib/reader/` as pure functions with no Svelte or DOM imports. Components call it; it never calls components.
- Heavy dependencies (pdf.js, JSZip) are imported dynamically, only when needed.

## Code Style

See `docs/CONVENTIONS.md`. Short version: `camelCase` functions and variables, `PascalCase.svelte` components, `kebab-case.ts` modules; Prettier formats everything.

## Safeguards

See `docs/SAFEGUARDS.md`. Never violate these without the user's explicit approval:

- Texts never leave the device: no server, no accounts, no analytics, no third-party requests carrying user content.
- The pivot letter sits at exactly the same screen position for every word, font size and width.
- No accounts, sync, social features, stats/streaks or AI features.

## Common Operations

### Adding a new feature

1. Create `docs/features/{feature-name}/CANVAS.md` from the canvas template (copy `reader-core` and clear it)
2. Fill R/E/A/S; ask the user to review
3. Derive Operations; implement them one by one
4. Sync the canvas when done

### Checks before calling something done

`npx prettier --check . && npm test && npm run check && npm run build` (same as CI)

## Important Files

- `docs/features/`: one REASONS canvas per feature
- `prototype/pivot-reader.html`: reference behaviour for Reader core
- `src/lib/reader/`: pivot, timing and tokenizing logic

## Things to Avoid

- Putting reading logic inside components (it must stay testable and reusable for Chinese).
- Reading `localStorage`/IndexedDB without try/catch; storage can be unavailable.
- Desktop-only interactions: every keyboard shortcut needs an on-screen control.

## Terminology

| Term        | Meaning                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| RSVP        | Rapid serial visual presentation: words shown one at a time in one place                 |
| Pivot / ORP | The highlighted letter (optimal recognition point), slightly left of centre              |
| Token       | One displayed unit (a word plus attached punctuation), with sentence/paragraph-end flags |
| WPM         | Words per minute; base display time per token is 60000 / WPM ms                          |
| Ease-in     | Slower first few tokens after pressing play                                              |
