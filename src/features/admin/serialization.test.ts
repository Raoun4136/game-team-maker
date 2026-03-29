import { describe, expect, it } from "vitest";

import { toIsoDateString, toOptionalIsoDateString } from "./serialization";

describe("admin serialization", () => {
  it("serializes Date instances to ISO strings", () => {
    expect(toIsoDateString(new Date("2026-03-29T08:00:00.000Z"))).toBe(
      "2026-03-29T08:00:00.000Z",
    );
  });

  it("preserves ISO-compatible strings", () => {
    expect(toIsoDateString("2026-03-29T08:00:00.000Z")).toBe(
      "2026-03-29T08:00:00.000Z",
    );
  });

  it("handles nullable timestamps", () => {
    expect(toOptionalIsoDateString(null)).toBeNull();
  });
});
