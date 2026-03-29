import { describe, expect, it } from "vitest";

import { normalizeGroupSlug } from "./group-slug";

describe("normalizeGroupSlug", () => {
  it("decodes percent-encoded Korean slugs", () => {
    expect(normalizeGroupSlug("%ED%85%8C%EC%8A%A4%ED%8A%B8-921e7359")).toBe(
      "테스트-921e7359",
    );
  });

  it("keeps ascii slugs unchanged", () => {
    expect(normalizeGroupSlug("debug-ascii-c8bd9a4c")).toBe(
      "debug-ascii-c8bd9a4c",
    );
  });

  it("returns the original value when decoding fails", () => {
    expect(normalizeGroupSlug("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
