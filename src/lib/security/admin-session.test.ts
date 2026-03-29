import { describe, expect, it } from "vitest";

import {
  buildAdminSessionExpiresAt,
  createAdminSessionToken,
  isValidAdminSessionToken,
  verifyAdminCredentials,
} from "./admin-session";

describe("admin session tokens", () => {
  it("accepts a valid untampered admin token", () => {
    const expiresAt = new Date("2026-03-29T03:00:00.000Z");
    const token = createAdminSessionToken({
      username: "admin",
      expiresAt,
      secret: "admin-secret",
    });

    expect(
      isValidAdminSessionToken({
        token,
        username: "admin",
        now: new Date("2026-03-29T02:00:00.000Z"),
        secret: "admin-secret",
      }),
    ).toBe(true);
  });

  it("rejects expired admin tokens", () => {
    const expiresAt = new Date("2026-03-29T03:00:00.000Z");
    const token = createAdminSessionToken({
      username: "admin",
      expiresAt,
      secret: "admin-secret",
    });

    expect(
      isValidAdminSessionToken({
        token,
        username: "admin",
        now: new Date("2026-03-29T03:00:01.000Z"),
        secret: "admin-secret",
      }),
    ).toBe(false);
  });

  it("rejects tampered admin tokens", () => {
    const expiresAt = new Date("2026-03-29T03:00:00.000Z");
    const token = createAdminSessionToken({
      username: "admin",
      expiresAt,
      secret: "admin-secret",
    });

    expect(
      isValidAdminSessionToken({
        token: token.replace("admin", "root"),
        username: "admin",
        now: new Date("2026-03-29T02:00:00.000Z"),
        secret: "admin-secret",
      }),
    ).toBe(false);
  });
});

describe("admin credential verification", () => {
  it("accepts matching credentials", () => {
    expect(
      verifyAdminCredentials({
        expectedUsername: "admin",
        expectedPassword: "secret",
        username: "admin",
        password: "secret",
      }),
    ).toBe(true);
  });

  it("rejects mismatched credentials", () => {
    expect(
      verifyAdminCredentials({
        expectedUsername: "admin",
        expectedPassword: "secret",
        username: "admin",
        password: "wrong",
      }),
    ).toBe(false);
  });
});

describe("buildAdminSessionExpiresAt", () => {
  it("adds the requested number of minutes", () => {
    const now = new Date("2026-03-29T01:00:00.000Z");
    const expiresAt = buildAdminSessionExpiresAt(90, now);

    expect(expiresAt.toISOString()).toBe("2026-03-29T02:30:00.000Z");
  });
});
