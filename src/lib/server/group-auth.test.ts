import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUnlockToken } from "../security/unlock-session";

describe("group unlock auth", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "https://example.com/test-db");
  });

  it("normalizes encoded slugs when building unlock cookie names", async () => {
    const { getUnlockCookieName } = await import("./group-auth");

    expect(getUnlockCookieName("%ED%85%8C%EC%8A%A4%ED%8A%B8-921e7359")).toBe(
      getUnlockCookieName("테스트-921e7359"),
    );
  });

  it("accepts unlock cookies for encoded group route params", async () => {
    const { getUnlockCookieName, getUnlockSecretForTests, hasSensitiveUnlock } =
      await import("./group-auth");
    const groupSlug = "테스트-921e7359";
    const encodedSlug = encodeURIComponent(groupSlug);
    const token = createUnlockToken({
      groupSlug,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      secret: getUnlockSecretForTests(),
    });

    const cookieStore = {
      get(name: string) {
        if (name === getUnlockCookieName(groupSlug)) {
          return { value: token };
        }

        return undefined;
      },
    };

    expect(hasSensitiveUnlock(encodedSlug, cookieStore)).toBe(true);
  });
});
