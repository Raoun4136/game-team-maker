import { describe, expect, it } from "vitest";

import { encodeEditorNameHeader } from "@/lib/editor-name-header";

import { getEditorName } from "./mutation-helpers";

describe("getEditorName", () => {
  it("decodes an encoded editor name header", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-editor-name": encodeEditorNameHeader("홍길동"),
      },
    });

    expect(getEditorName(request)).toBe("홍길동");
  });

  it("rejects missing editor names", () => {
    const request = new Request("https://example.com");

    expect(() => getEditorName(request)).toThrow(
      "An editor name is required before making changes.",
    );
  });
});
