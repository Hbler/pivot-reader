import { decodeText } from "./txt.ts";
import {
  ImportError,
  type ImportedDocument,
  type ImportErrorKind,
  type ImportProgress,
  type ImportSource,
} from "./types.ts";

export {
  ImportError,
  type ImportedDocument,
  type ImportErrorKind,
  type ImportProgress,
  type ImportSource,
};

export async function importFile(
  file: File,
  onProgress: (p: ImportProgress) => void,
  signal: AbortSignal,
): Promise<ImportedDocument> {
  signal.throwIfAborted();
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal.throwIfAborted();

  const baseName = file.name.slice(file.name.lastIndexOf("/") + 1);
  const hasExtension = baseName.indexOf(".", 1) !== -1;

  let format: "txt" | "markdown" | "epub" | "pdf";
  if (hasExtension) {
    const ext = baseName.slice(baseName.lastIndexOf(".")).toLowerCase();
    if (ext === ".txt") {
      format = "txt";
    } else if (ext === ".md" || ext === ".markdown") {
      format = "markdown";
    } else if (ext === ".epub") {
      format = "epub";
    } else if (ext === ".pdf") {
      format = "pdf";
    } else {
      throw new ImportError("unsupported");
    }
  } else if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 && // 'P'
    bytes[1] === 0x4b && // 'K'
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    format = "epub";
  } else if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 && // '%'
    bytes[1] === 0x50 && // 'P'
    bytes[2] === 0x44 && // 'D'
    bytes[3] === 0x46 // 'F'
  ) {
    format = "pdf";
  } else {
    throw new ImportError("unsupported");
  }

  switch (format) {
    case "txt": {
      const text = decodeText(bytes);
      if (!/[\p{L}\p{N}]/u.test(text)) {
        throw new ImportError("no-text");
      }
      const title = file.name.replace(/\.[^.]+$/, "");
      return {
        title,
        text,
        source: "txt",
      };
    }
    case "markdown": {
      const { importMarkdown } = await import("./markdown.ts");
      return importMarkdown(bytes, file.name);
    }
    case "epub": {
      const { importEpub } = await import("./epub.ts");
      return importEpub(bytes, file.name, onProgress, signal);
    }
    case "pdf": {
      const { importPdf } = await import("./pdf.ts");
      return importPdf(bytes, file.name, onProgress, signal);
    }
  }
}
