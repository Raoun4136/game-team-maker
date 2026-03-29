import { describe, expect, it } from "vitest";

import {
  createUnlockToken,
  isValidUnlockToken,
} from "./unlock-session";

describe("unlock session tokens", () => {
  it("accepts a valid untampered token", () => {
    const expiresAt = new Date("2026-03-29T01:00:00.000Z");
    const token = createUnlockToken({
      groupSlug: "friday-party",
      expiresAt,
      secret: "db-secret",
    });

    expect(
      isValidUnlockToken({
        token,
        groupSlug: "friday-party",
        now: new Date("2026-03-29T00:30:00.000Z"),
        secret: "db-secret",
      }),
    ).toBe(true);
  });

  it("rejects a token after expiry", () => {
    const expiresAt = new Date("2026-03-29T01:00:00.000Z");
    const token = createUnlockToken({
      groupSlug: "friday-party",
      expiresAt,
      secret: "db-secret",
    });

    expect(
      isValidUnlockToken({
        token,
        groupSlug: "friday-party",
        now: new Date("2026-03-29T01:00:01.000Z"),
        secret: "db-secret",
      }),
    ).toBe(false);
  });

  it("rejects a tampered token", () => {
    const expiresAt = new Date("2026-03-29T01:00:00.000Z");
    const token = createUnlockToken({
      groupSlug: "friday-party",
      expiresAt,
      secret: "db-secret",
    });

    expect(
      isValidUnlockToken({
        token: token.replace("friday-party", "saturday-party"),
        groupSlug: "friday-party",
        now: new Date("2026-03-29T00:30:00.000Z"),
        secret: "db-secret",
      }),
    ).toBe(false);
  });
});
