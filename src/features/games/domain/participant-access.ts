type ParticipantAccessInput = {
  requestedParticipantIds: string[];
  allowedMemberIds: string[];
  error: string;
  existingGameParticipantIds?: string[];
};

function validateRequestedIdsAgainstAllowedSet({
  requestedParticipantIds,
  allowedMemberIds,
  error,
  existingGameParticipantIds = [],
}: ParticipantAccessInput) {
  const allowedIds = new Set([
    ...allowedMemberIds,
    ...existingGameParticipantIds,
  ]);

  const hasOnlyAllowedMembers = requestedParticipantIds.every((memberId) =>
    allowedIds.has(memberId),
  );

  if (!hasOnlyAllowedMembers) {
    return {
      ok: false as const,
      error,
    };
  }

  return { ok: true as const };
}

export function validateRequestedParticipants(input: {
  requestedParticipantIds: string[];
  activeMemberIds: string[];
  existingGameParticipantIds?: string[];
}) {
  return validateRequestedIdsAgainstAllowedSet({
    requestedParticipantIds: input.requestedParticipantIds,
    allowedMemberIds: input.activeMemberIds,
    error: "Selected participants must be active members in the group.",
    existingGameParticipantIds: input.existingGameParticipantIds,
  });
}

export function validateRequestedPartyPoolParticipants(input: {
  requestedParticipantIds: string[];
  partyMemberIds: string[];
  existingGameParticipantIds?: string[];
}) {
  return validateRequestedIdsAgainstAllowedSet({
    requestedParticipantIds: input.requestedParticipantIds,
    allowedMemberIds: input.partyMemberIds,
    error: "Games can only include members saved in the party.",
    existingGameParticipantIds: input.existingGameParticipantIds,
  });
}
