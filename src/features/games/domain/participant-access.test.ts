import { describe, expect, it } from "vitest";

import {
  validateRequestedParticipants,
  validateRequestedPartyPoolParticipants,
} from "./participant-access";

describe("validateRequestedParticipants", () => {
  it("allows archived members that were already part of the existing game", () => {
    const result = validateRequestedParticipants({
      requestedParticipantIds: ["a", "b", "c"],
      activeMemberIds: ["a", "b"],
      existingGameParticipantIds: ["c"],
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects archived members when creating a new game", () => {
    const result = validateRequestedParticipants({
      requestedParticipantIds: ["a", "b", "c"],
      activeMemberIds: ["a", "b"],
      existingGameParticipantIds: [],
    });

    expect(result).toEqual({
      ok: false,
      error: "Selected participants must be active members in the group.",
    });
  });

  it("rejects archived members that were not already attached to the game", () => {
    const result = validateRequestedParticipants({
      requestedParticipantIds: ["a", "b", "d"],
      activeMemberIds: ["a", "b"],
      existingGameParticipantIds: ["c"],
    });

    expect(result).toEqual({
      ok: false,
      error: "Selected participants must be active members in the group.",
    });
  });
});

describe("validateRequestedPartyPoolParticipants", () => {
  it("allows historical players already attached to the game", () => {
    const result = validateRequestedPartyPoolParticipants({
      requestedParticipantIds: ["a", "b", "c"],
      partyMemberIds: ["a", "b"],
      existingGameParticipantIds: ["c"],
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects players outside the current party pool on new games", () => {
    const result = validateRequestedPartyPoolParticipants({
      requestedParticipantIds: ["a", "b", "c"],
      partyMemberIds: ["a", "b"],
      existingGameParticipantIds: [],
    });

    expect(result).toEqual({
      ok: false,
      error: "Games can only include members saved in the party.",
    });
  });
});
