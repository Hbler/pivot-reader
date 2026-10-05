import { describe, expect, it } from "vitest";
import { decodeText } from "./txt.ts";

describe("decodeText", () => {
  it('decodes plain UTF-8 "café"', () => {
    const bytes = new TextEncoder().encode("café");
    expect(decodeText(bytes)).toBe("café");
  });

  it("decodes UTF-8 with BOM (BOM not in output)", () => {
    const utf8Bytes = new TextEncoder().encode("café");
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8Bytes]);
    const result = decodeText(bytes);
    expect(result).toBe("café");
    expect(result.charCodeAt(0)).toBe("c".charCodeAt(0));
  });

  it("decodes UTF-16LE and UTF-16BE with BOM", () => {
    // "café" in UTF-16LE with BOM (0xFF, 0xFE)
    const utf16le = new Uint8Array([
      0xff, 0xfe, 0x63, 0x00, 0x61, 0x00, 0x66, 0x00, 0xe9, 0x00,
    ]);
    const leResult = decodeText(utf16le);
    expect(leResult).toBe("café");
    expect(leResult.charCodeAt(0)).toBe("c".charCodeAt(0));

    // "café" in UTF-16BE with BOM (0xFE, 0xFF)
    const utf16be = new Uint8Array([
      0xfe, 0xff, 0x00, 0x63, 0x00, 0x61, 0x00, 0x66, 0x00, 0xe9,
    ]);
    const beResult = decodeText(utf16be);
    expect(beResult).toBe("café");
    expect(beResult.charCodeAt(0)).toBe("c".charCodeAt(0));
  });

  it('decodes bytes [0x63,0x61,0x66,0xE9] → "café" via the Windows-1252 fallback', () => {
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    expect(decodeText(bytes)).toBe("café");
  });

  it('decodes empty input → ""', () => {
    expect(decodeText(new Uint8Array([]))).toBe("");
  });
});
