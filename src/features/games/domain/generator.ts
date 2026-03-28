export type TeamId = 1 | 2;

export type DraftConstraint =
  | { type: "same_team"; memberAId: string; memberBId: string }
  | { type: "different_team"; memberAId: string; memberBId: string }
  | { type: "pinned_team"; memberAId: string; targetTeam: TeamId };

type ValidationResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

type TeamAssignment = {
  team1: string[];
  team2: string[];
};

function normalizePair(memberAId: string, memberBId: string) {
  return [memberAId, memberBId].sort().join("::");
}

function assertEvenParticipants(memberIds: string[]) {
  if (memberIds.length < 2 || memberIds.length % 2 !== 0) {
    throw new Error("Two-team mode requires an even number of participants.");
  }
}

export function validateConstraints(
  memberIds: string[],
  constraints: DraftConstraint[],
): ValidationResult {
  const reasons = new Set<string>();
  const knownMembers = new Set(memberIds);
  const relationshipRules = new Map<string, "same_team" | "different_team">();
  const pinnedTeams = new Map<string, TeamId>();

  for (const constraint of constraints) {
    if (!knownMembers.has(constraint.memberAId)) {
      reasons.add(`Unknown member ${constraint.memberAId} was referenced.`);
      continue;
    }

    if (constraint.type === "pinned_team") {
      const existingTeam = pinnedTeams.get(constraint.memberAId);
      if (existingTeam && existingTeam !== constraint.targetTeam) {
        reasons.add(
          `Member ${constraint.memberAId} cannot be pinned to both teams.`,
        );
      }
      pinnedTeams.set(constraint.memberAId, constraint.targetTeam);
      continue;
    }

    if (!knownMembers.has(constraint.memberBId)) {
      reasons.add(`Unknown member ${constraint.memberBId} was referenced.`);
      continue;
    }

    const pairKey = normalizePair(constraint.memberAId, constraint.memberBId);
    const existingRule = relationshipRules.get(pairKey);

    if (existingRule && existingRule !== constraint.type) {
      reasons.add(
        `Members ${constraint.memberAId} and ${constraint.memberBId} cannot be required to be both together and apart.`,
      );
    }

    relationshipRules.set(pairKey, constraint.type);
  }

  if (reasons.size === 0) {
    return { ok: true };
  }

  return { ok: false, reasons: [...reasons] };
}

function isAssignmentValid(
  assignment: TeamAssignment,
  constraints: DraftConstraint[],
) {
  const teamLookup = new Map<string, TeamId>();

  for (const memberId of assignment.team1) {
    teamLookup.set(memberId, 1);
  }

  for (const memberId of assignment.team2) {
    teamLookup.set(memberId, 2);
  }

  return constraints.every((constraint) => {
    const memberATeam = teamLookup.get(constraint.memberAId);

    if (!memberATeam) {
      return false;
    }

    if (constraint.type === "pinned_team") {
      return memberATeam === constraint.targetTeam;
    }

    const memberBTeam = teamLookup.get(constraint.memberBId);

    if (!memberBTeam) {
      return false;
    }

    if (constraint.type === "same_team") {
      return memberATeam === memberBTeam;
    }

    return memberATeam !== memberBTeam;
  });
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) {
    return [[]];
  }

  if (items.length < size) {
    return [];
  }

  const [head, ...tail] = items;
  const withHead = combinations(tail, size - 1).map((combo) => [head, ...combo]);
  const withoutHead = combinations(tail, size);

  return [...withHead, ...withoutHead];
}

export function generateValidTeams(
  memberIds: string[],
  constraints: DraftConstraint[],
): TeamAssignment {
  assertEvenParticipants(memberIds);

  const validation = validateConstraints(memberIds, constraints);

  if (!validation.ok) {
    throw new Error(validation.reasons.join(" "));
  }

  const targetSize = memberIds.length / 2;
  const uniqueAssignments = combinations(memberIds, targetSize).filter((team1) =>
    team1.includes(memberIds[0]),
  );

  const validAssignments = uniqueAssignments
    .map<TeamAssignment>((team1) => {
      const team1Set = new Set(team1);
      return {
        team1,
        team2: memberIds.filter((memberId) => !team1Set.has(memberId)),
      };
    })
    .filter((assignment) => isAssignmentValid(assignment, constraints));

  if (validAssignments.length === 0) {
    throw new Error("No valid team assignment satisfies the active constraints.");
  }

  const selectedIndex = Math.floor(Math.random() * validAssignments.length);

  return validAssignments[selectedIndex];
}
