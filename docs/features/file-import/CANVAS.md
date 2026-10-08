# REASONS Canvas: File Import

**Status**: done locally (2026-10-07); ships with the next deploy
**Last synced with code**: 2026-10-07

---

## R — Requirements

Open a `.txt`, Markdown, EPUB or PDF file from the device and read it in Pivot Reader, the same way pasted text is read today. Until the Library feature, an opened file replaces the current document, exactly like "Read this text".

### User Stories

- As the reader, I want to open an EPUB book from my phone or computer, so that I can speed-read books, not only pasted articles.
- As the reader, I want to open a PDF (an article or paper), so that I don't have to copy its text by hand.
- As the reader, I want to open Markdown notes (including my Obsidian notes), so that they read as clean text without symbols like `#`, `**` or `[[ ]]`.
- As the reader, I want to see the title of what I'm reading, so that I know which document is loaded.

### Definition of Done

- [ ] "Open file…" in the text panel accepts `.txt`, `.md`/`.markdown`, `.epub` and `.pdf`, on desktop and phone
- [ ] On desktop, dropping a file onto the text panel opens it too
- [ ] `.txt`: UTF-8 (with or without BOM) and UTF-16 with BOM read correctly; text that isn't valid UTF-8 is read as Windows-1252
- [ ] Markdown: formatting symbols removed (headings, emphasis, lists, quotes, links keep their text, images dropped, tables read row by row, code kept as text); YAML front matter removed; Obsidian syntax handled: `[[Note|alias]]` → alias, `[[Note#Heading]]` → Note, `![[embed]]` and `%%comments%%` removed, `==highlight==` → its text, callout markers `> [!type] Title` → Title as its own paragraph
- [ ] EPUB: chapters in reading order (spine), paragraph breaks kept, images/styles/scripts ignored, items marked `linear="no"` skipped
- [ ] PDF: text from every page in order; paragraph breaks kept; a word hyphenated across a line end is joined; lines that are only a page number are dropped
- [ ] Imported text starts at the first word; the document title is shown in the header and remembered across reloads
- [ ] While a large file is read, the text panel shows progress (e.g. "Reading page 120 of 480") and the page stays responsive
- [ ] Errors show in the text panel in plain words, and the current document stays loaded
- [ ] If a document is too large to be remembered by the browser, the reader still opens it and says it won't survive a reload
- [ ] The textarea shows the imported text, so it can be edited and re-read like pasted text
- [ ] Importer code loads only when a file of that type is opened; the app shell stays under the 100 KB budget

### Edge Cases

| Scenario                                          | Expected Behavior                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Unsupported file type (`.docx`, `.mobi`, image)   | "Pivot Reader can open .txt, .md, .epub and .pdf files." Current document unchanged                       |
| DRM-protected EPUB (encrypted content documents)  | "This EPUB is copy-protected (DRM), so its text can't be read." Font-only encryption is not DRM: proceed  |
| Markdown with raw HTML (`<div>`, `<script>`)      | HTML is parsed for text only, never inserted into the page; scripts and styles are dropped                |
| Markdown with only front matter or only embeds    | "This file has no text to read." Current document unchanged                                               |
| Broken or truncated EPUB/PDF                      | "This file couldn't be read. It may be damaged."                                                          |
| Password-protected PDF                            | "This PDF is password-protected." (no password prompt)                                                    |
| Scanned PDF (no text layer)                       | "This PDF has no selectable text (it's probably a scan), so there's nothing to read."                     |
| File with no readable words after extraction      | "This file has no text to read." Current document unchanged                                               |
| Text too large for browser storage (~5 MB)        | Opens and reads normally; panel note: "Too large to remember: this document won't survive a reload."      |
| A new file is chosen while one is still importing | The earlier import is abandoned; only the latest file is loaded                                           |
| Playback running when a file is opened            | Playback pauses when the import starts                                                                    |
| PDF with CJK text needing CMaps                   | May extract poorly; no remote CMap download (Safeguard). Proper CJK support belongs to the Chinese canvas |

### Out of Scope

- Multiple documents, per-document positions, chapter navigation — `library` canvas
- Reading from URLs or cloud storage (would break "no network requests")
- OCR for scanned PDFs
- `.docx`, `.mobi`/`.azw`
- Following Obsidian links or embeds into other notes (only the opened file is read)
- Footnote/endnote handling beyond leaving their text in place
- Chinese text extraction quality — `chinese` canvas

## E — Entities

See [ARCHITECTURE.md › Domain Model](../../ARCHITECTURE.md#domain-model). Token and Settings are unchanged.

### ImportedDocument (new)

| Field  | Type                               | Description                                                                                          |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| title  | string                             | EPUB `dc:title`, PDF metadata title, Markdown front-matter `title`, else file name without extension |
| text   | string                             | Plain text; paragraphs separated by a blank line                                                     |
| source | `"txt" \| "md" \| "epub" \| "pdf"` | Format it came from                                                                                  |

### ImportProgress (new)

| Field | Type   | Description                                        |
| ----- | ------ | -------------------------------------------------- |
| done  | number | Units processed (pages for PDF, chapters for EPUB) |
| total | number | Total units                                        |
| unit  | string | `"page"` or `"chapter"`                            |

### ImportError (new)

A typed error with `kind: "unsupported" | "drm" | "damaged" | "password" | "no-text"`; the panel maps each kind to the message in Edge Cases.

### Saved state (changes)

| Key   | Type   | Description                                                 |
| ----- | ------ | ----------------------------------------------------------- |
| title | string | New. Current document title; pasted text uses "Pasted text" |
| text  | string | Unchanged key; now may hold an imported document's text     |

### Relationships

- File → ImportedDocument (one import) → becomes the single current Document (same path as "Read this text")

## A — Approach

All parsing runs in the browser; nothing is uploaded or fetched (Safeguard: texts never leave the device).

### Dispatch

`importFile(file, onProgress, signal)` picks the importer by extension, (`.md`/`.markdown` → Markdown). Only a file with no extension at all (some phone downloads) falls back to magic bytes (`PK\x03\x04` → EPUB, `%PDF` → PDF); any other extension is unsupported. (`.docx`, `.odt` and `.zip` are ZIP files too, so sniffing them would misreport them as damaged EPUBs.) Each importer is a dynamic `import()` so its library loads only when needed.

### TXT

`TextDecoder` with BOM detection: UTF-16 LE/BE BOM → that encoding; otherwise UTF-8 with `fatal: true`, and on failure re-decode as `windows-1252`.

### Markdown (marked + shared HTML-to-text)

1. Decode bytes as for TXT.
2. Front matter: if the file starts with a `---` line, everything up to the next `---` line is removed; a `title:` key in it becomes the title.
3. Obsidian pass (pure string function, before parsing; text inside fenced code blocks is left as written): remove `%%…%%` comments (also multi-line) and `![[…]]` embeds; `[[Note|alias]]` → `alias`, `[[Note#Heading]]` and `[[Note]]` → `Note`; `==text==` → `text`; a callout first line `> [!type] Title` → `> Title` followed by a `>` line, so the title is its own paragraph (the line is removed when there's no title).
4. Convert with `marked` to HTML, then to text with the same `htmlToText` used for EPUB chapters (images dropped; table rows as lines, cells separated by spaces; code blocks kept as text).
5. Title fallback: front-matter `title`, else the file name. (Not the first heading: many notes start with one that repeats the file name, but some don't have any.)

### EPUB (JSZip + DOMParser)

1. Read `META-INF/container.xml` → path of the OPF package file.
2. If `META-INF/encryption.xml` lists any resource other than fonts → DRM error.
3. From the OPF: `dc:title`, manifest, spine order; skip `linear="no"` items.
4. For each spine document: parse XHTML with `DOMParser` and convert it with the shared `htmlToText`: remove `script`, `style`, `nav`, `img`; take text per block element (`p`, `h1`–`h6`, `li`, `blockquote`, `pre`, `tr`, `div` without block children, `br` as line break), joining blocks with a blank line. Each chapter ends with a paragraph break.
5. Report progress per chapter and yield to the browser between chapters, so a large book doesn't freeze the page.

### PDF (pdf.js, worker bundled locally)

1. Load with the worker file served from our own build; no `cMapUrl` or `standardFontDataUrl` pointing anywhere remote; font loading disabled (text only).
2. Per page: `getTextContent()`; build lines from items with the pure `itemsToLines` (new line on `hasEOL` or a change in baseline; a space is inserted between items on one line when there's a visible gap and neither side has one), then paragraphs: a vertical gap larger than 1.5× the line spacing starts a new paragraph. Line spacing = the smallest gap between consecutive lines that is at least half the median line height (so superscripts and overlaps don't count); with no such gap, 1.2× the median line height.
3. Clean-up rules, as pure functions with tests: join `word-` + line break + lowercase continuation into one word; drop a line that is only a number (optionally with dashes, or "Page 3 of 10") at the top or bottom of a page; a paragraph that runs over a page break (no closing punctuation, next page starts lowercase) stays one paragraph.
4. Title: PDF metadata `Title` if present and not empty, else file name.
5. No text on any page → "no text" error. Password → "password" error.
6. Progress per page; extraction awaits each page, so the page stays responsive.

### Loading into the reader

The panel calls the same load path as "Read this text", plus title: pause, `player.load(text, 0)`, save `text`, `title` and `position`. `saveValue` returns whether the write succeeded; if saving `text` failed, show the "too large to remember" note and clear the saved `text` and `title` (save `null`), so a reload falls back to the sample instead of pairing the old text with the new title and position. Pasted text uses the same path. The textarea is filled with the imported text.

If extraction yields no words, nothing is replaced; the panel shows the "no text" message instead.

### UI

In the text panel, next to "Read this text": an "Open file…" button (a visually styled `<input type="file" accept=".txt,.md,.markdown,.epub,.pdf,text/plain,text/markdown,application/epub+zip,application/pdf">`). The panel `<details>` accepts drag-and-drop of one file on desktop. A status line under the buttons shows progress, errors or the storage note. The header shows the document title (truncated with an ellipsis) next to the word count.

### Alternatives Considered

- **epub.js** instead of JSZip + own parser: rejected. It's built for rendering pages; we only need text, and it's much larger.
- **IndexedDB now** for large documents: deferred to the `library` canvas, which needs it anyway. Until then, documents over the browser's storage limit open but aren't remembered, and the user is told.
- **PDF header/footer removal** by finding repeated lines across pages: deferred. Page-number lines are the common case; repeated running heads are rarer and the heuristic can drop real text.
- **Own Markdown stripper** (regexes) instead of `marked`: rejected. Nested lists, emphasis inside links and tables make regex stripping fragile; `marked` is ~13 KB gzipped, loads only for `.md`, and lets Markdown share the EPUB HTML-to-text code.
- **Dictionary hyphen rejoining for PDFs** (only join when the result is a known word): rejected; needs a word list per language. Joining only before a lowercase continuation is right most of the time.

## S — Structure

- **Adds**:
  - `src/lib/import/types.ts` — `ImportedDocument`, `ImportProgress`, `ImportError`
  - `src/lib/import/index.ts` — `importFile(file, onProgress, signal): Promise<ImportedDocument>` (dispatch by extension; magic bytes only for names without one; dynamic imports; re-exports the types)
  - `src/lib/import/txt.ts` — `decodeText(bytes): string`
  - `src/lib/import/html.ts` — pure `htmlToText(doc: Document): string`, shared by EPUB and Markdown
  - `src/lib/import/markdown.ts` — `importMarkdown(bytes, fileName)`, plus pure `stripFrontMatter(md)`, `preprocessObsidian(md)`
  - `src/lib/import/epub.ts` — `importEpub(bytes, onProgress, signal)`, plus pure `parseOpf(xml)`, `isDrmProtected(encryptionXml)`
  - `src/lib/import/pdf-text.ts` — pure `PdfLine` logic: `itemsToLines(items, pageHeight)`, `dropPageNumbers(lines)`, `linesToParagraphs(lines)`, `joinHyphenation(text)`, `pagesToText(pages)` (no pdf.js import, so it's tested in plain Node)
  - `src/lib/import/pdf.ts` — `importPdf(bytes, fileName, onProgress, signal)`: pdf.js loading, metadata, per-page text items, errors
  - Tests next to each: EPUBs built in the test with JSZip; DOM-based tests run in the `happy-dom` test environment; PDF clean-up tested on synthetic text items (no PDF fixtures in the repo)
  - Dependencies: `jszip`, `marked`, `pdfjs-dist`; dev: `happy-dom` (worker referenced through Vite's `?url` import so it's emitted as a local asset)
- **Changes**:
  - `src/lib/storage/local.ts` — `saveValue` returns `boolean` (true on success)
  - `src/components/TextPanel.svelte` — "Open file…" (visually hidden file input in a label), drop target on the panel, status line (`role="status"`), one import at a time via `AbortController`; "Read this text" also cancels a running import
  - `src/App.svelte` — `title` state and storage key, `loadDocument(text, title): boolean` shared by paste and import, header "{title} · {n} words" with ellipsis
- **Depends on**: Reader core (Player, storage, TextPanel)

### Interfaces

```ts
type ImportedDocument = {
  title: string;
  text: string;
  source: "txt" | "md" | "epub" | "pdf";
};
type ImportProgress = { done: number; total: number; unit: "page" | "chapter" };
class ImportError extends Error {
  kind: "unsupported" | "drm" | "damaged" | "password" | "no-text";
}

function importFile(
  file: File,
  onProgress: (p: ImportProgress) => void,
  signal: AbortSignal,
): Promise<ImportedDocument>;

function saveValue(key: string, value: unknown): boolean; // was void
```

---

## O — Operations

Concrete, testable steps, derived from R/E/A/S. Implement one at a time; code is written by agy and reviewed before ticking.

- [x] **O1**: `saveValue` returns `boolean` (true on success, false on any failure); existing callers unchanged — verify by: storage tests assert true/false for working, throwing and quota-exceeded storage
- [x] **O2**: `src/lib/import/types.ts` and `html.ts` (`htmlToText`); add `happy-dom` for DOM tests — verify by: tests for each block element, nested blocks, `br`, removed elements (`script`, `style`, `nav`, `img`), table rows, `pre` kept, whitespace collapsed inside blocks
- [x] **O3**: `txt.ts` (`decodeText`) — verify by: tests for UTF-8 with/without BOM, UTF-16 LE/BE with BOM, invalid UTF-8 falling back to Windows-1252 (`café` in 1252 bytes)
- [x] **O4**: `markdown.ts` (`stripFrontMatter`, `preprocessObsidian`, `importMarkdown` via `marked` + `htmlToText`) — verify by: tests for every Markdown and Obsidian rule in R, front-matter title, title fallback to file name, raw `<script>` dropped, only-front-matter file → no-text error
- [x] **O5**: `epub.ts` (`parseOpf`, `isDrmProtected`, `importEpub` with progress, yielding and abort) — verify by: tests on EPUBs built with JSZip: spine order, `linear="no"` skipped, title, font-only encryption allowed, DRM error, missing container → damaged error, abort stops early
- [x] **O6**: `pdf.ts` pure clean-up (`linesToParagraphs`, `joinHyphenation`, `dropPageNumbers`) — verify by: tests on synthetic lines: paragraph gaps, hyphen joins only before lowercase, page-number lines dropped only at page top/bottom
- [x] **O7**: `importPdf` with pdf.js (local worker via `?url`, no remote CMaps/fonts, progress, abort, password/no-text/damaged errors) — verify by: browser check with generated PDFs (one plain, one 500 pages) and the network log showing no requests outside the app
- [x] **O8**: `index.ts` `importFile` dispatch (extension, then magic bytes; unsupported error; dynamic imports) — verify by: tests for each extension, magic-byte fallback, unknown file → unsupported (importers mocked, so dispatch is tested on its own)
- [x] **O9**: UI: "Open file…" and drop target in TextPanel, status line (progress, errors, storage note), cancel previous import on a new file, shared load path with title in App, title in header — verify by: browser check opening a `.txt`, `.md` (Obsidian sample), EPUB and PDF; reload keeps title and position; error messages for unsupported/DRM/scanned files; build output shows separate chunks for jszip, marked and pdf.js (plus the pdf.js worker asset) and the app shell still < 100 KB gzipped

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific additions:

- Parsing helpers are pure functions taking strings/objects, so they're tested without real files or a browser.
- Error messages are written for the reader, never raw library errors.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific additions:

- No runtime network requests from importers: pdf.js worker bundled; no remote CMaps or fonts. Check the network panel while importing a PDF.
- App shell stays under 100 KB gzipped; JSZip (~27 KB gz), marked (~13 KB gz) and pdf.js (~128 KB gz + ~366 KB gz worker) load only on demand.
- A 500-page PDF or a full novel EPUB imports without freezing the page (progress updates visibly while importing).

---

## Change Log

| Date       | Section    | Change                                                                                                                                   | Reason                                                                                                                                   |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-04 | R, E, A, S | Markdown (`.md`/`.markdown`) added, with front matter and Obsidian syntax handling; EPUB text conversion becomes the shared `htmlToText` | User request at R/E/A/S review                                                                                                           |
| 2026-10-04 | A, S       | PDF clean-up split into pure `pdf-text.ts` (+ `pagesToText`, paragraphs joined across page breaks); Obsidian pass skips fenced code      | Found while specifying O4/O6: keeps pure rules testable without pdf.js, and avoids changing code samples                                 |
| 2026-10-04 | R, A       | Callout title becomes its own paragraph                                                                                                  | Trying O4 on a real note: the title ran into the body as one sentence with no pause ("Keep the eyes still The pivot…")                   |
| 2026-10-04 | A, S       | Text items → lines moves into pure `itemsToLines` in `pdf-text.ts`                                                                       | Specifying O7: line building and space insertion are pure logic worth unit tests without pdf.js                                          |
| 2026-10-04 | A          | Line spacing for paragraph detection = smallest normal gap, not the median gap                                                           | O7 browser check: a 3-line page with one paragraph break had gaps [2L, L]; their median (1.5L) hid the break. Long pages were unaffected |
| 2026-10-05 | O          | Separate-chunk check moves from O8 to O9                                                                                                 | Chunks only appear in the build once the UI imports `importFile` (O9)                                                                    |
| 2026-10-05 | A          | Magic-byte fallback only for files without an extension                                                                                  | O8 review: a real `.docx` (a ZIP) was sniffed as EPUB and reported as damaged instead of unsupported                                     |
| 2026-10-05 | A          | Failed text save clears saved text and title                                                                                             | Specifying O9: otherwise a reload would show the previous document under the new title, with the new document's position                 |
| 2026-10-07 | S          | Synced with code after O9                                                                                                                | Sync step of the feature loop. Bundle: shell 23.3 KB gz; markdown 14.2, epub 30.0, pdf 130.3 KB gz + worker, each loaded on demand       |
