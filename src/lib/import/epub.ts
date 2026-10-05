import JSZip from "jszip";
import { htmlToText } from "./html.ts";
import {
  ImportError,
  type ImportedDocument,
  type ImportProgress,
} from "./types.ts";

function resolvePath(baseFolder: string, relativePath: string): string {
  const withoutFragment = relativePath.split("#")[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    decoded = withoutFragment;
  }
  const combined = baseFolder ? `${baseFolder}/${decoded}` : decoded;
  const parts = combined.split("/");
  const stack: string[] = [];

  for (const part of parts) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join("/");
}

export function parseOpf(
  opfXml: string,
  opfPath: string,
): { title: string; spine: string[] } {
  const doc = new DOMParser().parseFromString(opfXml, "application/xml");
  const all = Array.from(doc.getElementsByTagName("*"));

  const titleEl = all.find((e) => e.localName.toLowerCase() === "title");
  const title = titleEl?.textContent?.trim() ?? "";

  const manifest = new Map<string, string>();
  const itemEls = all.filter((e) => e.localName.toLowerCase() === "item");
  for (const item of itemEls) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) {
      manifest.set(id, href);
    }
  }

  const lastSlash = opfPath.lastIndexOf("/");
  const opfFolder = lastSlash !== -1 ? opfPath.slice(0, lastSlash) : "";

  const spine: string[] = [];
  const itemrefEls = all.filter((e) => e.localName.toLowerCase() === "itemref");
  for (const itemref of itemrefEls) {
    const linear = itemref.getAttribute("linear");
    if (linear && linear.toLowerCase() === "no") {
      continue;
    }
    const idref = itemref.getAttribute("idref");
    if (!idref) {
      continue;
    }
    const rawHref = manifest.get(idref);
    if (!rawHref) {
      // Unknown idrefs are skipped
      continue;
    }
    spine.push(resolvePath(opfFolder, rawHref));
  }

  return { title, spine };
}

export function isDrmProtected(encryptionXml: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(
      encryptionXml,
      "application/xml",
    );
    const all = Array.from(doc.getElementsByTagName("*"));
    const hasParserError = all.some(
      (e) => e.localName.toLowerCase() === "parsererror",
    );
    if (hasParserError) {
      return true;
    }

    const encryptedDataList = all.filter(
      (e) => e.localName.toLowerCase() === "encrypteddata",
    );
    for (const encData of encryptedDataList) {
      const descendants = Array.from(encData.getElementsByTagName("*"));
      const encMethod = descendants.find(
        (e) => e.localName.toLowerCase() === "encryptionmethod",
      );
      const algo =
        encMethod?.getAttribute("Algorithm") ??
        encMethod?.getAttribute("algorithm") ??
        "";
      const isFontAlgo =
        algo === "http://www.idpf.org/2008/embedding" ||
        algo === "http://ns.adobe.com/pdf/enc#RC";

      const cipherRef = descendants.find(
        (e) => e.localName.toLowerCase() === "cipherreference",
      );
      const uri =
        cipherRef?.getAttribute("URI") ?? cipherRef?.getAttribute("uri") ?? "";
      const cleanUri = uri.split("#")[0].split("?")[0].trim();
      const isFontUri = /\.(ttf|otf|woff|woff2)$/i.test(cleanUri);

      if (!isFontAlgo && !isFontUri) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

export async function importEpub(
  bytes: Uint8Array,
  fileName: string,
  onProgress: (p: ImportProgress) => void,
  signal: AbortSignal,
): Promise<ImportedDocument> {
  signal.throwIfAborted();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new ImportError("damaged");
  }

  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new ImportError("damaged");
  }

  let containerXml: string;
  try {
    containerXml = await containerFile.async("string");
  } catch {
    throw new ImportError("damaged");
  }

  let containerDoc: Document;
  try {
    containerDoc = new DOMParser().parseFromString(
      containerXml,
      "application/xml",
    );
  } catch {
    throw new ImportError("damaged");
  }

  const containerElements = Array.from(containerDoc.getElementsByTagName("*"));
  if (
    containerElements.some((e) => e.localName.toLowerCase() === "parsererror")
  ) {
    throw new ImportError("damaged");
  }

  const rootfile = containerElements.find(
    (e) => e.localName.toLowerCase() === "rootfile",
  );
  const fullPath =
    rootfile?.getAttribute("full-path") ??
    rootfile?.getAttribute("fullPath") ??
    "";
  if (!fullPath.trim()) {
    throw new ImportError("damaged");
  }

  const opfFile = zip.file(fullPath);
  if (!opfFile) {
    throw new ImportError("damaged");
  }

  let opfXml: string;
  try {
    opfXml = await opfFile.async("string");
  } catch {
    throw new ImportError("damaged");
  }

  const encryptionFile = zip.file("META-INF/encryption.xml");
  if (encryptionFile) {
    let encXml: string;
    try {
      encXml = await encryptionFile.async("string");
    } catch {
      throw new ImportError("damaged");
    }
    if (isDrmProtected(encXml)) {
      throw new ImportError("drm");
    }
  }

  const opf = parseOpf(opfXml, fullPath);

  const chapters: string[] = [];
  for (let i = 0; i < opf.spine.length; i++) {
    const href = opf.spine[i];
    const chapterFile = zip.file(href);
    if (chapterFile) {
      let xhtml: string;
      try {
        xhtml = await chapterFile.async("string");
      } catch {
        xhtml = "";
      }

      let chapterDoc = new DOMParser().parseFromString(
        xhtml,
        "application/xhtml+xml",
      );
      const hasError = Array.from(chapterDoc.getElementsByTagName("*")).some(
        (e) => e.localName.toLowerCase() === "parsererror",
      );
      if (hasError) {
        chapterDoc = new DOMParser().parseFromString(xhtml, "text/html");
      }

      const chapterText = htmlToText(chapterDoc);
      if (chapterText.trim().length > 0) {
        chapters.push(chapterText);
      }
    }

    onProgress({ done: i + 1, total: opf.spine.length, unit: "chapter" });
    signal.throwIfAborted();
    await new Promise((r) => setTimeout(r, 0));
  }

  const text = chapters.join("\n\n");
  if (!/[\p{L}\p{N}]/u.test(text)) {
    throw new ImportError("no-text");
  }

  const title = opf.title || fileName.replace(/\.[^.]+$/, "");

  return {
    title,
    text,
    source: "epub",
  };
}
