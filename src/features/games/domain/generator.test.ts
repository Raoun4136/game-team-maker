import { describe, expect, it } from "vitest";

import {
  generateValidTeams,
  moveMemberToTeam,
  validateTeamAssignment,
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

describe("validateTeamAssignment", () => {
  it("rejects odd participant counts with a validation result", () => {
    const result = validateTeamAssignment(
      ["a", "b", "c"],
      [],
      [
        { memberId: "a", teamId: 1 },
        { memberId: "b", teamId: 1 },
        { memberId: "c", teamId: 2 },
      ],
    );

    expect(result).toEqual({
      ok: false,
      reasons: ["Two-team mode requires an even number of participants."],
    });
  });

  it("rejects assignments that break active constraints", () => {
    const result = validateTeamAssignment(
      ["a", "b", "c", "d"],
      [{ type: "same_team", memberAId: "a", memberBId: "b" }],
      [
        { memberId: "a", teamId: 1 },
        { memberId: "b", teamId: 2 },
        { memberId: "c", teamId: 1 },
        { memberId: "d", teamId: 2 },
      ],
    );

    expect(result.ok).toBe(false);
  });

  it("accepts valid edited assignments", () => {
    const result = validateTeamAssignment(
      ["a", "b", "c", "d"],
      [{ type: "different_team", memberAId: "a", memberBId: "c" }],
      [
        { memberId: "a", teamId: 1 },
        { memberId: "b", teamId: 1 },
        { memberId: "c", teamId: 2 },
        { memberId: "d", teamId: 2 },
      ],
    );

    expect(result).toEqual({ ok: true });
  });
});

describe("moveMemberToTeam", () => {
  it("rejects team moves when no valid swap satisfies the constraints", () => {
    const result = moveMemberToTeam(
      ["a", "b", "c", "d"],
      [{ type: "same_team", memberAId: "a", memberBId: "b" }],
      [
        { memberId: "a", teamId: 1 },
        { memberId: "b", teamId: 1 },
        { memberId: "c", teamId: 2 },
        { memberId: "d", teamId: 2 },
      ],
      "a",
      2,
    );

    expect(result).toEqual({
      ok: false,
      reasons: ["The final team layout does not satisfy the active constraints."],
    });
  });

  it("returns swapped assignments when the move is valid", () => {
    const result = moveMemberToTeam(
      ["a", "b", "c", "d"],
      [],
      [
        { memberId: "a", teamId: 1 },
        { memberId: "b", teamId: 1 },
        { memberId: "c", teamId: 2 },
        { memberId: "d", teamId: 2 },
      ],
      "a",
      2,
    );

    expect(result).toEqual({
      ok: true,
      assignments: [
        { memberId: "a", teamId: 2 },
        { memberId: "b", teamId: 1 },
        { memberId: "c", teamId: 1 },
        { memberId: "d", teamId: 2 },
      ],
    });
  });
});
