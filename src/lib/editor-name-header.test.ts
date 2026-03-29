import { describe, expect, it } from "vitest";

import { decodeEditorNameHeader, encodeEditorNameHeader } from "./editor-name-header";

describe("editor name header encoding", () => {
  it("encodes non-ascii editor names into an ASCII-safe header value", () => {
    expect(encodeEditorNameHeader("홍길동")).toBe("%ED%99%8D%EA%B8%B8%EB%8F%99");
  });

  it("decodes encoded editor names back to their original value", () => {
    expect(decodeEditorNameHeader("%ED%99%8D%EA%B8%B8%EB%8F%99")).toBe("홍길동");
  });

  it("keeps plain ascii editor names readable", () => {
    expect(decodeEditorNameHeader(encodeEditorNameHeader("Smoke Tester"))).toBe(
      "Smoke Tester",
    );
  });
});
