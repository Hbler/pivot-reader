# Code Conventions (Norms)

Cross-cutting engineering standards. Every REASONS canvas links here as its **N** section.

## Naming

- **Files**: `kebab-case.ts` modules, `PascalCase.svelte` components, tests next to the module as `*.test.ts`.
- **Variables and functions**: `camelCase`; booleans read as questions (`isPlaying`, `sentenceEnd`).
- **Types**: `PascalCase` (`Token`, `Settings`).

## Structure

- `src/lib/reader/`: pure TypeScript, no Svelte or DOM imports.
- `src/lib/storage/`: the only place that touches `localStorage` or IndexedDB.
- `src/components/`: one component per visible region (stage, controls, progress, context, text panel).
- Svelte 5 runes only. Shared reactive state lives in `*.svelte.ts` files.

## Patterns

### Every action has a button

Each keyboard shortcut maps to an action function; the same function is bound to an on-screen control with a visible label or `aria-label`. Controls have touch targets of at least 44px.

### Buttons drop focus after a pointer click

When a button is clicked or tapped (`event.detail > 0`), blur it after running its action, so Space keeps meaning play/pause. Keyboard activation (`event.detail === 0`) keeps focus.

### Lazy heavy code

Libraries used by one feature (pdf.js, JSZip) are loaded with dynamic `import()` at the moment they are needed.

## Error Handling & Defensive Coding

- Wrap every storage read and write in try/catch; the app must work with storage unavailable.
- Validate restored state (position within range, WPM within 100–1000) before using it.
- Errors the user can act on (unreadable file, empty text) show as a message in the page, in plain words.

## Testing

- Vitest for `src/lib/reader/` and other pure logic. No component or e2e tests.
- Name tests by behaviour: `pivotIndex › skips leading quotes`.
- Run `npx prettier --check . && npm test && npm run check && npm run build` before calling an Operation done (CI runs the same steps; docs are formatted too).

## Tooling and Workflow

- Prettier (with the Svelte plugin) and `svelte-check`. No ESLint.
- Commit directly to `main`; GitHub Actions builds and deploys to Pages on push.

## Observability

None. No logging service, no analytics. Problems surface in the UI.

## Anti-Patterns

### Don't: put timing or pivot rules in components

They must stay testable and swappable for other languages. Put them in `src/lib/reader/`.

### Don't: use `setInterval` for playback

Each token has its own duration; chain `setTimeout` per token instead.
