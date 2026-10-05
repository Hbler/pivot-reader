const SKIPPED_TAGS = new Set([
  "script",
  "style",
  "nav",
  "img",
  "svg",
  "noscript",
  "template",
  "head",
]);

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "ul",
]);

export function htmlToText(root: Document | Element): string {
  const startNode: Element | null =
    "body" in root && "documentElement" in root
      ? (root.body ?? root.documentElement)
      : root;

  if (!startNode) {
    return "";
  }

  const blocks: string[] = [];
  let buffer = "";
  let preDepth = 0;

  function flush(): void {
    if (buffer.length === 0) {
      return;
    }

    if (preDepth > 0) {
      // inside <pre>, keep line breaks, trim trailing spaces on each line, drop leading/trailing blank lines
      const rawLines = buffer.replace(/\r\n?/g, "\n").split("\n");
      const lines = rawLines.map((line) => line.replace(/[ \t]+$/, ""));
      let start = 0;
      while (start < lines.length && lines[start].length === 0) {
        start++;
      }
      let end = lines.length - 1;
      while (end >= start && lines[end].length === 0) {
        end--;
      }
      if (start <= end) {
        blocks.push(lines.slice(start, end + 1).join("\n"));
      }
    } else {
      // outside <pre>, collapse runs of spaces/tabs to one space, trim each line, drop empty lines
      const rawLines = buffer.replace(/\r\n?/g, "\n").split("\n");
      const lines: string[] = [];
      for (const rawLine of rawLines) {
        const collapsed = rawLine.replace(/[ \t]+/g, " ").trim();
        if (collapsed.length > 0) {
          lines.push(collapsed);
        }
      }
      if (lines.length > 0) {
        blocks.push(lines.join("\n"));
      }
    }

    buffer = "";
  }

  function walk(node: Node): void {
    if (node.nodeType === 1) {
      // Element
      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      if (SKIPPED_TAGS.has(tag)) {
        return;
      }

      if (tag === "br") {
        buffer += "\n";
        return;
      }

      const isBlock = BLOCK_TAGS.has(tag);
      const isPre = tag === "pre";

      if (isBlock) {
        flush();
      }

      if (isPre) {
        preDepth++;
      }

      for (
        let child = node.firstChild;
        child !== null;
        child = child.nextSibling
      ) {
        walk(child);
      }

      if (tag === "td" || tag === "th") {
        buffer += " ";
      }

      if (isBlock) {
        flush();
      }

      if (isPre) {
        preDepth--;
      }
    } else if (node.nodeType === 3) {
      // Text node
      const text = node.nodeValue ?? "";
      if (preDepth > 0) {
        buffer += text;
      } else {
        buffer += text.replace(/[\r\n]+/g, " ");
      }
    }
  }

  walk(startNode);
  flush();

  return blocks.join("\n\n");
}
