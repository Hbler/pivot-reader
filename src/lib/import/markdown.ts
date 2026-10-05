import { marked } from "marked";
import { decodeText } from "./txt.ts";
import { htmlToText } from "./html.ts";
import { ImportError, type ImportedDocument } from "./types.ts";

export function stripFrontMatter(md: string): { body: string; title?: string } {
  const match = md.match(
    /^(\uFEFF)?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/,
  );
  if (!match) {
    return { body: md, title: undefined };
  }

  const frontMatterContent = match[2];
  const body = md.slice(match[0].length);

  let title: string | undefined;
  const lines = frontMatterContent.split(/\r?\n/);
  for (const line of lines) {
    const titleMatch = line.match(/^title:\s*(.*)$/);
    if (titleMatch) {
      let val = titleMatch[1].trim();
      if (
        (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
        (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
      ) {
        val = val.slice(1, -1);
      }
      val = val.trim();
      if (val.length > 0) {
        title = val;
      }
      break;
    }
  }

  return { body, title };
}

export function preprocessObsidian(md: string): string {
  const lines = md.split(/(?<=\r?\n)/);
  const chunks: { isCode: boolean; text: string }[] = [];
  let currentChunk = "";
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;

  for (const line of lines) {
    const rawLine = line.replace(/\r?\n$/, "");
    if (!inFence) {
      const match = rawLine.match(/^[ ]{0,3}(`{3,}|~{3,})(.*)$/);
      if (match) {
        if (currentChunk.length > 0) {
          chunks.push({ isCode: false, text: currentChunk });
          currentChunk = "";
        }
        inFence = true;
        fenceChar = match[1][0];
        fenceLen = match[1].length;
        currentChunk = line;
      } else {
        currentChunk += line;
      }
    } else {
      currentChunk += line;
      const match = rawLine.match(/^[ ]{0,3}(`+|~+)\s*$/);
      if (match && match[1][0] === fenceChar && match[1].length >= fenceLen) {
        chunks.push({ isCode: true, text: currentChunk });
        currentChunk = "";
        inFence = false;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({ isCode: inFence, text: currentChunk });
  }

  return chunks
    .map((chunk) => {
      if (chunk.isCode) {
        return chunk.text;
      }

      let text = chunk.text;

      // 1. Remove %%…%% comments (including multi-line ones)
      text = text.replace(/%%[\s\S]*?%%/g, "");

      // 2. Remove ![[…]] embeds
      text = text.replace(/!\[\[[\s\S]*?\]\]/g, "");

      // 3. [[target|alias]] → alias; [[target]] → target without #heading or #^block; [[#Heading]] → Heading
      text = text.replace(/\[\[([^\]\r\n]+)\]\]/g, (_, inner: string) => {
        if (inner.includes("|")) {
          return inner.slice(inner.indexOf("|") + 1);
        }
        if (inner.startsWith("#")) {
          return inner.slice(1);
        }
        const hashIndex = inner.indexOf("#");
        if (hashIndex !== -1) {
          return inner.slice(0, hashIndex);
        }
        return inner;
      });

      // 4. ==text== (on one line) → text
      text = text.replace(/==([^\r\n]+?)==/g, "$1");

      // 5. Callout first lines
      const chunkLines = text.split(/(?<=\r?\n)/);
      const resultLines: string[] = [];
      for (const line of chunkLines) {
        const lineNoEnd = line.replace(/\r?\n$/, "");
        const ending = line.slice(lineNoEnd.length);
        const match = lineNoEnd.match(
          /^(\s*(?:>\s*)+)\[!([a-zA-Z0-9_-]+)\][+-]?\s*(.*)$/,
        );
        if (match) {
          const prefix = match[1];
          const title = match[3].trim();
          if (title.length > 0) {
            const lineEnding =
              ending || (text.includes("\r\n") ? "\r\n" : "\n");
            resultLines.push(prefix + title + lineEnding);
            resultLines.push(prefix.trimEnd() + ending);
          }
          // otherwise remove the line
        } else {
          resultLines.push(line);
        }
      }

      return resultLines.join("");
    })
    .join("");
}

export async function importMarkdown(
  bytes: Uint8Array,
  fileName: string,
): Promise<ImportedDocument> {
  const raw = decodeText(bytes);
  const { body, title: frontMatterTitle } = stripFrontMatter(raw);
  const preprocessed = preprocessObsidian(body);
  const html = marked.parse(preprocessed, {
    async: false,
    gfm: true,
  }) as string;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = htmlToText(doc);

  if (!/[\p{L}\p{N}]/u.test(text)) {
    throw new ImportError("no-text");
  }

  const title = frontMatterTitle ?? fileName.replace(/\.[^.]+$/, "");

  return {
    title,
    text,
    source: "md",
  };
}
