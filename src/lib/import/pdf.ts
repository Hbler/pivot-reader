import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  itemsToLines,
  pagesToText,
  type PdfLine,
  type PdfTextItem,
} from "./pdf-text.ts";
import {
  ImportError,
  type ImportedDocument,
  type ImportProgress,
} from "./types.ts";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function importPdf(
  bytes: Uint8Array,
  fileName: string,
  onProgress: (p: ImportProgress) => void,
  signal: AbortSignal,
): Promise<ImportedDocument> {
  signal.throwIfAborted();

  const loadingTask = pdfjs.getDocument({
    data: bytes.slice(),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    stopAtErrors: false,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]);

  let doc: pdfjs.PDFDocumentProxy | null = null;
  try {
    try {
      doc = await loadingTask.promise;
    } catch (err: unknown) {
      signal.throwIfAborted();
      if (
        err !== null &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "PasswordException"
      ) {
        throw new ImportError("password");
      }
      throw new ImportError("damaged");
    }

    signal.throwIfAborted();

    let title: string | undefined;
    try {
      const metadata = await doc.getMetadata();
      const info = metadata?.info as Record<string, unknown> | undefined;
      const rawTitle = info?.Title;
      if (typeof rawTitle === "string" && rawTitle.trim().length > 0) {
        title = rawTitle.trim();
      }
    } catch {
      // Metadata errors are ignored.
    }

    if (!title) {
      title = fileName.replace(/\.[^.]+$/, "");
    }

    const allPages: PdfLine[][] = [];

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const pageHeight = viewport.height;
      const textContent = await page.getTextContent();

      const items: PdfTextItem[] = [];
      for (const item of textContent.items) {
        if ("str" in item) {
          items.push({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            hasEOL: item.hasEOL,
          });
        }
      }

      const lines = itemsToLines(items, pageHeight);
      allPages.push(lines);
      page.cleanup();
      onProgress({ done: n, total: doc.numPages, unit: "page" });
      signal.throwIfAborted();
    }

    const text = pagesToText(allPages);
    if (!/[\p{L}\p{N}]/u.test(text)) {
      throw new ImportError("no-text");
    }

    return {
      title,
      text,
      source: "pdf",
    };
  } finally {
    try {
      if (doc) {
        await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.();
      }
    } catch {
      // ignore
    }
    try {
      await loadingTask.destroy();
    } catch {
      // ignore
    }
  }
}
