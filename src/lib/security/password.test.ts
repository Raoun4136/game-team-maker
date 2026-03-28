import { describe, expect, it } from "vitest";

import {
  buildUnlockExpiresAt,
  hashGroupPassword,
  isUnlockExpired,
  verifyGroupPassword,
} from "./password";

describe("group password helpers", () => {
  it("hashes and verifies a valid password", async () => {
    const hash = await hashGroupPassword("secret-passphrase");

    await expect(
      verifyGroupPassword("secret-passphrase", hash),
    ).resolves.toBe(true);
    await expect(verifyGroupPassword("wrong-passphrase", hash)).resolves.toBe(
      false,
    );
  });

  it("builds an unlock expiration from the configured session window", () => {
    const now = new Date("2026-03-29T00:00:00.000Z");
    const expiresAt = buildUnlockExpiresAt(30, now);

    expect(expiresAt.toISOString()).toBe("2026-03-29T00:30:00.000Z");
  });

  it("reports whether an unlock session has expired", () => {
    const now = new Date("2026-03-29T00:30:01.000Z");

    expect(
      isUnlockExpired(new Date("2026-03-29T00:30:00.000Z"), now),
    ).toBe(true);
    expect(
      isUnlockExpired(new Date("2026-03-29T00:31:00.000Z"), now),
    ).toBe(false);
  });
});
