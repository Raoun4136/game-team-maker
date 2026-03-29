import { describe, expect, it } from "vitest";

import { gameUpsertSchema } from "./shared";

describe("gameUpsertSchema", () => {
  it("rejects odd participant counts in two-team mode", () => {
    const result = gameUpsertSchema.safeParse({
      name: "Odd Match",
      team1Name: "Blue",
      team2Name: "Red",
      participantIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ],
      constraints: [],
      assignments: [
        { memberId: "11111111-1111-4111-8111-111111111111", teamId: 1 },
        { memberId: "22222222-2222-4222-8222-222222222222", teamId: 1 },
        { memberId: "33333333-3333-4333-8333-333333333333", teamId: 2 },
      ],
      winnerTeam: null,
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected validation to fail.");
    }

    expect(result.error.issues[0]?.message).toBe(
      "Two-team mode requires an even number of participants.",
    );
  });
});
