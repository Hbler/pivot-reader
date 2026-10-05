// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  importMarkdown,
  preprocessObsidian,
  stripFrontMatter,
} from "./markdown.ts";
import { ImportError } from "./types.ts";

describe("stripFrontMatter", () => {
  it("extracts front matter with title", () => {
    const md =
      "---\ntitle: My Document\nauthor: Jane\n---\n# Content starts here";
    const res = stripFrontMatter(md);
    expect(res.title).toBe("My Document");
    expect(res.body).toBe("# Content starts here");
  });

  it("handles front matter without title", () => {
    const md = "---\nauthor: Jane\ndate: 2026-10-04\n---\nBody text";
    const res = stripFrontMatter(md);
    expect(res.title).toBeUndefined();
    expect(res.body).toBe("Body text");
  });

  it("handles single-quoted and double-quoted title", () => {
    const single = "---\ntitle: 'Single Quoted'\n---\nBody";
    expect(stripFrontMatter(single).title).toBe("Single Quoted");

    const double = '---\ntitle: "Double Quoted"\n---\nBody';
    expect(stripFrontMatter(double).title).toBe("Double Quoted");
  });

  it("handles empty title as undefined", () => {
    const empty1 = "---\ntitle:\n---\nBody";
    expect(stripFrontMatter(empty1).title).toBeUndefined();

    const empty2 = '---\ntitle: ""\n---\nBody';
    expect(stripFrontMatter(empty2).title).toBeUndefined();

    const empty3 = "---\ntitle: ''\n---\nBody";
    expect(stripFrontMatter(empty3).title).toBeUndefined();
  });

  it("handles closing delimiter with ...", () => {
    const md = "---\ntitle: Dots\n...\nBody text";
    const res = stripFrontMatter(md);
    expect(res.title).toBe("Dots");
    expect(res.body).toBe("Body text");
  });

  it("leaves unclosed front matter alone", () => {
    const md = "---\ntitle: Unclosed\nBody without closing delimiter";
    const res = stripFrontMatter(md);
    expect(res.title).toBeUndefined();
    expect(res.body).toBe(md);
  });

  it("ignores front matter if first line is not exactly ---", () => {
    const md = "Some text\n---\ntitle: Foo\n---\nMore text";
    const res = stripFrontMatter(md);
    expect(res.title).toBeUndefined();
    expect(res.body).toBe(md);
  });

  it("handles optional BOM before first ---", () => {
    const md = "\uFEFF---\ntitle: With BOM\n---\nBody text";
    const res = stripFrontMatter(md);
    expect(res.title).toBe("With BOM");
    expect(res.body).toBe("Body text");
  });
});

describe("preprocessObsidian", () => {
  it("removes %%…%% comments, including multi-line ones", () => {
    const input =
      "Before %%inline comment%% Middle %%multi\nline\ncomment%% After";
    expect(preprocessObsidian(input)).toBe("Before  Middle  After");
  });

  it("removes ![[…]] embeds", () => {
    const input =
      "Here is an image: ![[image.png]] and an embed ![[Note#heading]] done.";
    expect(preprocessObsidian(input)).toBe(
      "Here is an image:  and an embed  done.",
    );
  });

  it("handles wikilinks with alias, headings, and blocks", () => {
    expect(preprocessObsidian("[[target|alias]]")).toBe("alias");
    expect(preprocessObsidian("[[target]]")).toBe("target");
    expect(preprocessObsidian("[[target#heading]]")).toBe("target");
    expect(preprocessObsidian("[[target#^block]]")).toBe("target");
    expect(preprocessObsidian("[[#Heading]]")).toBe("Heading");
  });

  it("replaces ==text== on one line with text", () => {
    expect(preprocessObsidian("This is ==highlighted== text.")).toBe(
      "This is highlighted text.",
    );
    expect(preprocessObsidian("This is ==not\nhighlighted==")).toBe(
      "This is ==not\nhighlighted==",
    );
  });

  it("handles callout first lines with and without title", () => {
    const withTitle = "> [!note] Callout Title\n> Body text";
    expect(preprocessObsidian(withTitle)).toBe(
      "> Callout Title\n>\n> Body text",
    );

    const withFoldable = "> [!warning]+ Warning Title\n> Body text";
    expect(preprocessObsidian(withFoldable)).toBe(
      "> Warning Title\n>\n> Body text",
    );

    const withoutTitle = "> [!note]\n> Body text";
    expect(preprocessObsidian(withoutTitle)).toBe("> Body text");

    const withoutTitleSpaced = "> [!info]   \n> Body text";
    expect(preprocessObsidian(withoutTitleSpaced)).toBe("> Body text");

    const nested = "> > [!note] Inner\n> > Body text";
    expect(preprocessObsidian(nested)).toBe("> > Inner\n> >\n> > Body text");

    const crlf = "> [!note] Title\r\n> Body text";
    expect(preprocessObsidian(crlf)).toBe("> Title\r\n>\r\n> Body text");
  });

  it("keeps [[x]] and ==y== literally inside fenced code blocks", () => {
    const input =
      "Outside [[note|alias]] ==hi==\n```python\nx = [[note|alias]]\ny = ==hi==\n%%comment%%\n```\nOutside again [[link]]";
    const expected =
      "Outside alias hi\n```python\nx = [[note|alias]]\ny = ==hi==\n%%comment%%\n```\nOutside again link";
    expect(preprocessObsidian(input)).toBe(expected);

    const tildeInput =
      "~~~text\n[[literal]] ==literal== ![[embed]]\n~~~\n[[outside]]";
    const expectedTilde =
      "~~~text\n[[literal]] ==literal== ![[embed]]\n~~~\noutside";
    expect(preprocessObsidian(tildeInput)).toBe(expectedTilde);
  });
});

describe("importMarkdown", () => {
  it("imports a rich markdown note with all required elements", async () => {
    const md = `# Main Heading

**Bold text** and *italic text*.

- Bullet one
- Bullet two

[Click here](https://example.com/ignored-url)

![Alt description](photo.jpg)

| Column 1 | Column 2 |
| --- | --- |
| Row 1 A | Row 1 B |
| Row 2 A | Row 2 B |

\`\`\`ts
const code = 42;
\`\`\`

<script>alert(1)</script>
`;

    const bytes = new TextEncoder().encode(md);
    const doc = await importMarkdown(bytes, "rich-note.md");

    expect(doc.source).toBe("md");
    expect(doc.title).toBe("rich-note");

    // Heading present
    expect(doc.text).toContain("Main Heading");
    // Bold / italic kept without asterisks
    expect(doc.text).toContain("Bold text and italic text.");
    // Bullet list items present
    expect(doc.text).toContain("Bullet one");
    expect(doc.text).toContain("Bullet two");
    // Link text kept, URL gone
    expect(doc.text).toContain("Click here");
    expect(doc.text).not.toContain("https://example.com");
    // Image gone
    expect(doc.text).not.toContain("photo.jpg");
    expect(doc.text).not.toContain("Alt description");
    // Table rows as separate paragraphs, cells separated by spaces
    expect(doc.text).toContain("Column 1 Column 2");
    expect(doc.text).toContain("Row 1 A Row 1 B");
    expect(doc.text).toContain("Row 2 A Row 2 B");
    // Fenced code kept
    expect(doc.text).toContain("const code = 42;");
    // Raw script text gone
    expect(doc.text).not.toContain("alert(1)");
    expect(doc.text).not.toContain("<script>");
  });

  it("uses front-matter title if present", async () => {
    const md = "---\ntitle: The Real Title\n---\nSome text here.";
    const bytes = new TextEncoder().encode(md);
    const doc = await importMarkdown(bytes, "fallback.md");
    expect(doc.title).toBe("The Real Title");
    expect(doc.text).toBe("Some text here.");
  });

  it("falls back to filename without last extension for title", async () => {
    const md = "Some text without front matter.";
    const bytes = new TextEncoder().encode(md);
    const doc = await importMarkdown(bytes, "my-note.md");
    expect(doc.title).toBe("my-note");
  });

  it("imports callouts with title as its own paragraph", async () => {
    const md = "> [!tip] Keep the eyes still\n> The pivot letter never moves.";
    const bytes = new TextEncoder().encode(md);
    const doc = await importMarkdown(bytes, "callout.md");
    expect(doc.text).toBe(
      "Keep the eyes still\n\nThe pivot letter never moves.",
    );
    expect(doc.text).toContain(
      "Keep the eyes still\n\nThe pivot letter never moves.",
    );
  });

  it("throws ImportError('no-text') on a file with only front matter and an embed", async () => {
    const md =
      "---\ntitle: Empty Note\n---\n![[an-image.png]]\n%%just a comment%%";
    const bytes = new TextEncoder().encode(md);
    await expect(importMarkdown(bytes, "empty.md")).rejects.toThrow(
      ImportError,
    );
    await expect(importMarkdown(bytes, "empty.md")).rejects.toMatchObject({
      kind: "no-text",
    });
  });
});
