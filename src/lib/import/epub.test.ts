// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importEpub, isDrmProtected, parseOpf } from "./epub.ts";
import { ImportError, type ImportProgress } from "./types.ts";

describe("parseOpf", () => {
  it("extracts title, spine order, resolves relative and percent-encoded paths, and skips linear='no' and unknown idrefs", () => {
    const opfXml = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>  Alice in Wonderland  </dc:title>
  </metadata>
  <manifest>
    <item id="c1" href="ch1.xhtml#start" media-type="application/xhtml+xml"/>
    <item id="c2" href="sub/ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="c3" href="../text/ch%203.xhtml" media-type="application/xhtml+xml"/>
    <item id="notes" href="notes.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="notes" linear="no"/>
    <itemref idref="unknown-id"/>
    <itemref idref="c2"/>
    <itemref idref="c3"/>
  </spine>
</package>`;

    const parsed = parseOpf(opfXml, "OEBPS/content.opf");

    expect(parsed.title).toBe("Alice in Wonderland");
    expect(parsed.spine).toEqual([
      "OEBPS/ch1.xhtml",
      "OEBPS/sub/ch2.xhtml",
      "text/ch 3.xhtml",
    ]);
  });

  it("handles empty title when dc:title is missing or whitespace", () => {
    const opfXml = `<package><metadata></metadata><manifest/><spine/></package>`;
    const parsed = parseOpf(opfXml, "content.opf");
    expect(parsed.title).toBe("");
  });
});

describe("isDrmProtected", () => {
  it("returns true for an aes128 encrypted chapter", () => {
    const xml = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <EncryptedData>
        <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>
        <CipherData><CipherReference URI="OEBPS/ch1.xhtml"/></CipherData>
      </EncryptedData>
    </encryption>`;
    expect(isDrmProtected(xml)).toBe(true);
  });

  it("returns false for font obfuscation algorithms", () => {
    const xml = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <EncryptedData>
        <EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/>
        <CipherData><CipherReference URI="fonts/font1.otf"/></CipherData>
      </EncryptedData>
      <EncryptedData>
        <EncryptionMethod Algorithm="http://ns.adobe.com/pdf/enc#RC"/>
        <CipherData><CipherReference URI="fonts/font2.ttf"/></CipherData>
      </EncryptedData>
    </encryption>`;
    expect(isDrmProtected(xml)).toBe(false);
  });

  it("returns false for encrypted font files by extension (.woff2, .ttf, .otf, .woff)", () => {
    const xml = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <EncryptedData>
        <EncryptionMethod Algorithm="http://example.com/custom-crypto"/>
        <CipherData><CipherReference URI="fonts/custom.WOFF2"/></CipherData>
      </EncryptedData>
    </encryption>`;
    expect(isDrmProtected(xml)).toBe(false);
  });

  it("returns true for unparseable XML", () => {
    expect(isDrmProtected("<<<not valid xml")).toBe(true);
  });
});

describe("importEpub", () => {
  async function createEpubZip(options: {
    title?: string;
    chapters?: { href: string; html: string; linear?: string }[];
    includeContainer?: boolean;
    containerXml?: string;
    encryptionXml?: string;
    includeNav?: boolean;
  }): Promise<Uint8Array> {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");

    if (options.includeContainer !== false) {
      zip.file(
        "META-INF/container.xml",
        options.containerXml ??
          `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      );
    }

    if (options.encryptionXml) {
      zip.file("META-INF/encryption.xml", options.encryptionXml);
    }

    const chapters = options.chapters ?? [
      {
        href: "chapter1.xhtml",
        html: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter 1</h1>
    <p>First paragraph of chapter one.</p>
  </body>
</html>`,
      },
      {
        href: "chapter2.xhtml",
        html: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter 2</h1>
    <p>Second chapter paragraph.</p>
  </body>
</html>`,
      },
    ];

    let manifestItems = "";
    let spineItems = "";
    chapters.forEach((ch, idx) => {
      const id = `item-${idx + 1}`;
      manifestItems += `<item id="${id}" href="${ch.href}" media-type="application/xhtml+xml"/>\n`;
      const linearAttr = ch.linear ? ` linear="${ch.linear}"` : "";
      spineItems += `<itemref idref="${id}"${linearAttr}/>\n`;
      zip.file(`OEBPS/${ch.href}`, ch.html);
    });

    if (options.includeNav) {
      manifestItems += `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n`;
      zip.file(
        "OEBPS/nav.xhtml",
        `<html><body><nav>Table of Contents</nav></body></html>`,
      );
    }

    const titleXml =
      options.title !== undefined
        ? `<dc:title>${options.title}</dc:title>`
        : `<dc:title>Great Expectations</dc:title>`;

    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${titleXml}
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;

    zip.file("OEBPS/content.opf", opf);

    return zip.generateAsync({ type: "uint8array" });
  }

  it("reads chapters in spine order with paragraph breaks, skipping unlisted nav doc", async () => {
    const bytes = await createEpubZip({
      title: "My EPUB Title",
      includeNav: true,
    });
    const progress: ImportProgress[] = [];
    const controller = new AbortController();

    const doc = await importEpub(
      bytes,
      "book.epub",
      (p) => progress.push(p),
      controller.signal,
    );

    expect(doc.source).toBe("epub");
    expect(doc.title).toBe("My EPUB Title");
    expect(doc.text).toBe(
      "Chapter 1\n\nFirst paragraph of chapter one.\n\nChapter 2\n\nSecond chapter paragraph.",
    );
    expect(doc.text).not.toContain("Table of Contents");
    expect(progress).toEqual([
      { done: 1, total: 2, unit: "chapter" },
      { done: 2, total: 2, unit: "chapter" },
    ]);
  });

  it("falls back to file name if OPF has no title", async () => {
    const bytes = await createEpubZip({ title: "" });
    const doc = await importEpub(
      bytes,
      "fallback-title.epub",
      () => {},
      new AbortController().signal,
    );
    expect(doc.title).toBe("fallback-title");
  });

  it("throws ImportError('drm') when DRM-protected", async () => {
    const drmXml = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <EncryptedData>
        <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>
        <CipherData><CipherReference URI="OEBPS/chapter1.xhtml"/></CipherData>
      </EncryptedData>
    </encryption>`;
    const bytes = await createEpubZip({ encryptionXml: drmXml });

    await expect(
      importEpub(
        bytes,
        "protected.epub",
        () => {},
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: "drm" });
  });

  it("throws ImportError('damaged') on random bytes", async () => {
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(
      importEpub(
        randomBytes,
        "damaged.epub",
        () => {},
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: "damaged" });
  });

  it("throws ImportError('damaged') on missing container.xml", async () => {
    const bytes = await createEpubZip({ includeContainer: false });
    await expect(
      importEpub(bytes, "damaged.epub", () => {}, new AbortController().signal),
    ).rejects.toMatchObject({ kind: "damaged" });
  });

  it("throws ImportError('no-text') on empty chapters", async () => {
    const bytes = await createEpubZip({
      chapters: [
        {
          href: "ch1.xhtml",
          html: `<html><body><p>   </p></body></html>`,
        },
      ],
    });
    await expect(
      importEpub(bytes, "empty.epub", () => {}, new AbortController().signal),
    ).rejects.toMatchObject({ kind: "no-text" });
  });

  it("stops with AbortError when signal is aborted after first progress call", async () => {
    const bytes = await createEpubZip({
      chapters: [
        { href: "ch1.xhtml", html: "<html><body><p>One</p></body></html>" },
        { href: "ch2.xhtml", html: "<html><body><p>Two</p></body></html>" },
        { href: "ch3.xhtml", html: "<html><body><p>Three</p></body></html>" },
      ],
    });

    const controller = new AbortController();
    const progress: ImportProgress[] = [];

    const promise = importEpub(
      bytes,
      "book.epub",
      (p) => {
        progress.push(p);
        if (p.done === 1) {
          controller.abort();
        }
      },
      controller.signal,
    );

    await expect(promise).rejects.toThrow();
    expect(progress).toHaveLength(1);
    expect(progress[0]).toEqual({ done: 1, total: 3, unit: "chapter" });
  });
});
