import { describe, expect, it } from "vitest";

import {
  generateValidTeams,
  validateConstraints,
} from "./generator";

describe("validateConstraints", () => {
  it("flags conflicting relationship rules", () => {
    const result = validateConstraints(["a", "b"], [
      { type: "same_team", memberAId: "a", memberBId: "b" },
      { type: "different_team", memberAId: "a", memberBId: "b" },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failure result");
    }
    expect(result.reasons).toContain(
      "Members a and b cannot be required to be both together and apart.",
    );
  });

  it("flags conflicting pinned team rules", () => {
    const result = validateConstraints(["a"], [
      { type: "pinned_team", memberAId: "a", targetTeam: 1 },
      { type: "pinned_team", memberAId: "a", targetTeam: 2 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failure result");
    }
    expect(result.reasons).toContain(
      "Member a cannot be pinned to both teams.",
    );
  });

  it("accepts a valid mix of rules", () => {
    const result = validateConstraints(["a", "b", "c", "d"], [
      { type: "same_team", memberAId: "a", memberBId: "b" },
      { type: "different_team", memberAId: "c", memberBId: "d" },
      { type: "pinned_team", memberAId: "a", targetTeam: 1 },
    ]);

    expect(result).toEqual({ ok: true });
  });
});

describe("generateValidTeams", () => {
  it("generates two balanced teams that obey constraints", () => {
    const result = generateValidTeams(["a", "b", "c", "d"], [
      { type: "same_team", memberAId: "a", memberBId: "b" },
      { type: "different_team", memberAId: "a", memberBId: "c" },
      { type: "pinned_team", memberAId: "a", targetTeam: 1 },
    ]);

    expect(result.team1).toHaveLength(2);
    expect(result.team2).toHaveLength(2);
    expect(result.team1).toEqual(expect.arrayContaining(["a", "b"]));
    expect(result.team2).not.toContain("a");
    expect(result.team2).toContain("c");
  });

  it("throws when no valid assignment exists", () => {
    expect(() =>
      generateValidTeams(["a", "b"], [
        { type: "same_team", memberAId: "a", memberBId: "b" },
        { type: "different_team", memberAId: "a", memberBId: "b" },
      ]),
    ).toThrow(
      "Members a and b cannot be required to be both together and apart.",
    );
  });
});
