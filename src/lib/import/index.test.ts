import { beforeEach, describe, expect, it, vi } from "vitest";
import { importFile, ImportError } from "./index.ts";

const { importMarkdownSpy, importEpubSpy, importPdfSpy } = vi.hoisted(() => ({
  importMarkdownSpy: vi.fn(),
  importEpubSpy: vi.fn(),
  importPdfSpy: vi.fn(),
}));

vi.mock("./markdown.ts", () => ({
  importMarkdown: importMarkdownSpy,
}));

vi.mock("./epub.ts", () => ({
  importEpub: importEpubSpy,
}));

vi.mock("./pdf.ts", () => ({
  importPdf: importPdfSpy,
}));

describe("importFile", () => {
  const fakeMarkdownDoc = {
    title: "Mock Markdown",
    text: "Markdown text",
    source: "md" as const,
  };

  const fakeEpubDoc = {
    title: "Mock EPUB",
    text: "EPUB text",
    source: "epub" as const,
  };

  const fakePdfDoc = {
    title: "Mock PDF",
    text: "PDF text",
    source: "pdf" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    importMarkdownSpy.mockResolvedValue(fakeMarkdownDoc);
    importEpubSpy.mockResolvedValue(fakeEpubDoc);
    importPdfSpy.mockResolvedValue(fakePdfDoc);
  });

  it('decodes "a.txt" and returns with title "a" and source "txt" without calling any mock', async () => {
    const file = new File(["Sample text document content"], "a.txt");
    const onProgress = vi.fn();
    const controller = new AbortController();

    const result = await importFile(file, onProgress, controller.signal);

    expect(result).toEqual({
      title: "a",
      text: "Sample text document content",
      source: "txt",
    });
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importEpubSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('calls importMarkdown for "notes.MD" and "x.markdown"', async () => {
    const onProgress = vi.fn();
    const controller = new AbortController();

    const file1 = new File(["# Notes"], "notes.MD");
    const result1 = await importFile(file1, onProgress, controller.signal);

    expect(importMarkdownSpy).toHaveBeenCalledTimes(1);
    expect(importMarkdownSpy).toHaveBeenLastCalledWith(
      expect.any(Uint8Array),
      "notes.MD",
    );
    expect(result1).toBe(fakeMarkdownDoc);

    const file2 = new File(["# Second file"], "x.markdown");
    const result2 = await importFile(file2, onProgress, controller.signal);

    expect(importMarkdownSpy).toHaveBeenCalledTimes(2);
    expect(importMarkdownSpy).toHaveBeenLastCalledWith(
      expect.any(Uint8Array),
      "x.markdown",
    );
    expect(result2).toBe(fakeMarkdownDoc);

    expect(importEpubSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('calls importEpub for "book.EPUB" with onProgress and signal', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "book.EPUB");
    const onProgress = vi.fn();
    const controller = new AbortController();

    const result = await importFile(file, onProgress, controller.signal);

    expect(importEpubSpy).toHaveBeenCalledTimes(1);
    expect(importEpubSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      "book.EPUB",
      onProgress,
      controller.signal,
    );
    expect(result).toBe(fakeEpubDoc);
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('calls importPdf for "paper.pdf"', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "paper.pdf");
    const onProgress = vi.fn();
    const controller = new AbortController();

    const result = await importFile(file, onProgress, controller.signal);

    expect(importPdfSpy).toHaveBeenCalledTimes(1);
    expect(importPdfSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      "paper.pdf",
      onProgress,
      controller.signal,
    );
    expect(result).toBe(fakePdfDoc);
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importEpubSpy).not.toHaveBeenCalled();
  });

  it('calls importEpub for "download" with PK\\x03\\x04 bytes', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const file = new File([bytes], "download");
    const onProgress = vi.fn();
    const controller = new AbortController();

    const result = await importFile(file, onProgress, controller.signal);

    expect(importEpubSpy).toHaveBeenCalledTimes(1);
    expect(importEpubSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      "download",
      onProgress,
      controller.signal,
    );
    expect(result).toBe(fakeEpubDoc);
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('calls importPdf for "download" with "%PDF-1.7"', async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 header");
    const file = new File([bytes], "download");
    const onProgress = vi.fn();
    const controller = new AbortController();

    const result = await importFile(file, onProgress, controller.signal);

    expect(importPdfSpy).toHaveBeenCalledTimes(1);
    expect(importPdfSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      "download",
      onProgress,
      controller.signal,
    );
    expect(result).toBe(fakePdfDoc);
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importEpubSpy).not.toHaveBeenCalled();
  });

  it('throws ImportError kind "unsupported" for "report.docx" with PK\\x03\\x04 bytes and does not call importEpub', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const file = new File([bytes], "report.docx");
    const onProgress = vi.fn();
    const controller = new AbortController();

    await expect(
      importFile(file, onProgress, controller.signal),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof ImportError && err.kind === "unsupported";
    });
    expect(importEpubSpy).not.toHaveBeenCalled();
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('throws ImportError kind "unsupported" for "archive.zip" with PK bytes', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const file = new File([bytes], "archive.zip");
    const onProgress = vi.fn();
    const controller = new AbortController();

    await expect(
      importFile(file, onProgress, controller.signal),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof ImportError && err.kind === "unsupported";
    });
    expect(importEpubSpy).not.toHaveBeenCalled();
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('throws ImportError kind "unsupported" for "slides.key" with %PDF bytes and does not call importPdf', async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 header");
    const file = new File([bytes], "slides.key");
    const onProgress = vi.fn();
    const controller = new AbortController();

    await expect(
      importFile(file, onProgress, controller.signal),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof ImportError && err.kind === "unsupported";
    });
    expect(importPdfSpy).not.toHaveBeenCalled();
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importEpubSpy).not.toHaveBeenCalled();
  });

  it('calls importEpub for ".hidden" with PK\\x03\\x04 bytes', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const file = new File([bytes], ".hidden");
    const onProgress = vi.fn();
    const controller = new AbortController();

    const result = await importFile(file, onProgress, controller.signal);

    expect(importEpubSpy).toHaveBeenCalledTimes(1);
    expect(importEpubSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      ".hidden",
      onProgress,
      controller.signal,
    );
    expect(result).toBe(fakeEpubDoc);
  });

  it('throws ImportError kind "unsupported" for "image.png" with other bytes', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const file = new File([pngBytes], "image.png");
    const onProgress = vi.fn();
    const controller = new AbortController();

    await expect(
      importFile(file, onProgress, controller.signal),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof ImportError && err.kind === "unsupported";
    });
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importEpubSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it('throws ImportError kind "no-text" for an empty "empty.txt"', async () => {
    const file = new File([], "empty.txt");
    const onProgress = vi.fn();
    const controller = new AbortController();

    await expect(
      importFile(file, onProgress, controller.signal),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof ImportError && err.kind === "no-text";
    });
    expect(importMarkdownSpy).not.toHaveBeenCalled();
    expect(importEpubSpy).not.toHaveBeenCalled();
    expect(importPdfSpy).not.toHaveBeenCalled();
  });

  it("rejects with an AbortError before reading when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File(["Text"], "a.txt");
    const arrayBufferSpy = vi.spyOn(file, "arrayBuffer");

    await expect(
      importFile(file, vi.fn(), controller.signal),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err !== null &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "AbortError"
      );
    });
    expect(arrayBufferSpy).not.toHaveBeenCalled();
  });
});
