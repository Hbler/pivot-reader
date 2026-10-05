// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { htmlToText } from "./html.ts";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("htmlToText", () => {
  const blockElements = [
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
  ];

  for (const tag of blockElements) {
    it(`block element <${tag}> splits paragraphs`, () => {
      const doc = parse(`<p>Before</p><${tag}>Inside</${tag}><p>After</p>`);
      expect(htmlToText(doc)).toBe("Before\n\nInside\n\nAfter");
    });
  }

  it("block element <hr> splits paragraphs", () => {
    const doc = parse("<p>Before</p><hr><p>After</p>");
    expect(htmlToText(doc)).toBe("Before\n\nAfter");
  });

  it("nested blocks (div > p, li > p) don't produce empty paragraphs", () => {
    const docDiv = parse("<div><p>First</p><p>Second</p></div>");
    expect(htmlToText(docDiv)).toBe("First\n\nSecond");

    const docLi = parse(
      "<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>",
    );
    expect(htmlToText(docLi)).toBe("Item 1\n\nItem 2");
  });

  it("inline elements (em, a, span) stay in the same paragraph", () => {
    const doc = parse(
      '<p>Here is <em>emphasized</em> text with <span>span</span> and <a href="#">a link</a>.</p>',
    );
    expect(htmlToText(doc)).toBe(
      "Here is emphasized text with span and a link.",
    );
  });

  it("br splits lines inside one paragraph", () => {
    const doc = parse("<p>First line<br>Second line<br>Third line</p>");
    expect(htmlToText(doc)).toBe("First line\nSecond line\nThird line");

    const docConsecutiveBr = parse("<p>First line<br><br>Second line</p>");
    expect(htmlToText(docConsecutiveBr)).toBe("First line\nSecond line");
  });

  it("script/style/nav/img text is gone", () => {
    const doc = parse(
      "<div>Visible <script>alert('bad');</script><style>.bad{}</style><nav>Nav links</nav><img alt='an image'><svg><text>svg</text></svg><noscript>no script</noscript><template>template</template>text</div>",
    );
    expect(htmlToText(doc)).toBe("Visible text");

    const docStandaloneNav = parse(
      "<nav><a href='#'>Menu</a></nav><p>Hello</p>",
    );
    expect(htmlToText(docStandaloneNav)).toBe("Hello");
  });

  it("table rows become separate blocks with cells separated by spaces", () => {
    const doc = parse(
      "<table>" +
        "<thead><tr><th>H1</th><th>H2</th></tr></thead>" +
        "<tbody><tr><td>C1</td><td>C2</td></tr><tr><td>C3</td><td>C4</td></tr></tbody>" +
        "</table>",
    );
    expect(htmlToText(doc)).toBe("H1 H2\n\nC1 C2\n\nC3 C4");
  });

  it("pre keeps its lines", () => {
    const doc = parse("<pre>\n  const a = 1;  \n\n  const b = 2;  \n</pre>");
    expect(htmlToText(doc)).toBe("  const a = 1;\n\n  const b = 2;");
  });

  it("whitespace inside a paragraph collapses", () => {
    const doc = parse(
      "<p>  Multiple   spaces    and \t tabs \t  collapse  </p>",
    );
    expect(htmlToText(doc)).toBe("Multiple spaces and tabs collapse");
  });

  it('empty input → ""', () => {
    expect(htmlToText(parse(""))).toBe("");
    expect(htmlToText(parse("   "))).toBe("");
    expect(htmlToText(parse("<p></p>"))).toBe("");
    expect(htmlToText(parse("<script>console.log('hi');</script>"))).toBe("");
    expect(htmlToText(parse("<div>   \n   \t  </div>"))).toBe("");
  });

  it("works with an Element root", () => {
    const doc = parse('<div id="content"><p>Hello</p><p>World</p></div>');
    const el = doc.getElementById("content")!;
    expect(htmlToText(el)).toBe("Hello\n\nWorld");
  });

  it("does not mutate the DOM", () => {
    const doc = parse("<p>Hello <em>world</em><script>bad</script></p>");
    const p = doc.querySelector("p")!;
    const originalHtml = p.outerHTML;
    htmlToText(doc);
    expect(p.outerHTML).toBe(originalHtml);
  });
});
