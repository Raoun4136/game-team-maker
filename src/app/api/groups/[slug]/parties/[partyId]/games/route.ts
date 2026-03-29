import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  DraftConstraint,
  validateTeamAssignment,
} from "@/features/games/domain/generator";
import {
  validateRequestedParticipants,
  validateRequestedPartyPoolParticipants,
} from "@/features/games/domain/participant-access";
import { gameUpsertSchema } from "@/features/games/shared";
import { logAuditEvent } from "@/lib/audit/log-event";
import { getDb } from "@/lib/db";
import {
  gameConstraints,
  gameParticipants,
  games,
  members,
  partyMembers,
} from "@/lib/db/schema";
import { getEditorName, requirePartyInGroup } from "@/lib/server/mutation-helpers";

function mapConstraintsForInsert(
  gameId: string,
  constraints: DraftConstraint[],
) {
  return constraints.map((constraint) => {
    if (constraint.type === "pinned_team") {
      return {
        gameId,
        constraintType: constraint.type,
        memberAId: constraint.memberAId,
        memberBId: null,
        targetTeam: constraint.targetTeam,
      };
    }

    return {
      gameId,
      constraintType: constraint.type,
      memberAId: constraint.memberAId,
      memberBId: constraint.memberBId,
      targetTeam: null,
    };
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; partyId: string }> },
) {
  const { slug, partyId } = await context.params;
  const editorName = getEditorName(request);
  const { group, party } = await requirePartyInGroup(slug, partyId);
  const payload = await request.json().catch(() => null);
  const parsed = gameUpsertSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid game payload." },
      { status: 400 },
    );
  }

  if (party.status !== "active") {
    return NextResponse.json(
      { error: "Ended parties cannot create new games." },
      { status: 409 },
    );
  }

  const db = getDb();
  const partyPool = await db
    .select({ memberId: partyMembers.memberId })
    .from(partyMembers)
    .where(eq(partyMembers.partyId, party.id));

  const partyPoolValidation = validateRequestedPartyPoolParticipants({
    requestedParticipantIds: parsed.data.participantIds,
    partyMemberIds: partyPool.map((member) => member.memberId),
  });

  if (!partyPoolValidation.ok) {
    return NextResponse.json(
      { error: partyPoolValidation.error },
      { status: 400 },
    );
  }

  const activeMembers = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.groupId, group.id),
        inArray(members.id, parsed.data.participantIds),
        isNull(members.archivedAt),
      ),
    );

  const participantValidation = validateRequestedParticipants({
    requestedParticipantIds: parsed.data.participantIds,
    activeMemberIds: activeMembers.map((member) => member.id),
  });

  if (!participantValidation.ok) {
    return NextResponse.json(
      { error: participantValidation.error },
      { status: 400 },
    );
  }

  const assignmentValidation = validateTeamAssignment(
    parsed.data.participantIds,
    parsed.data.constraints,
    parsed.data.assignments,
  );

  if (!assignmentValidation.ok) {
    return NextResponse.json(
      { error: assignmentValidation.reasons.join(" ") },
      { status: 400 },
    );
  }

  const [createdGame] = await db
    .insert(games)
    .values({
      partyId: party.id,
      name: parsed.data.name,
      team1Name: parsed.data.team1Name,
      team2Name: parsed.data.team2Name,
      winnerTeam: parsed.data.winnerTeam ?? null,
      createdByName: editorName,
    })
    .returning({
      id: games.id,
      name: games.name,
      winnerTeam: games.winnerTeam,
    });

  await db.insert(gameParticipants).values(
    parsed.data.assignments.map((assignment) => ({
      gameId: createdGame.id,
      memberId: assignment.memberId,
      assignedTeam: assignment.teamId,
    })),
  );

  if (parsed.data.constraints.length > 0) {
    await db
      .insert(gameConstraints)
      .values(mapConstraintsForInsert(createdGame.id, parsed.data.constraints));
  }

  await logAuditEvent({
    groupId: group.id,
    partyId: party.id,
    gameId: createdGame.id,
    actorName: editorName,
    eventType: createdGame.winnerTeam ? "game.created-with-result" : "game.created",
    changeSummary: `Created game ${createdGame.name} in ${party.name}.`,
    payloadJson: {
      gameId: createdGame.id,
      participantIds: parsed.data.participantIds,
      winnerTeam: createdGame.winnerTeam,
    },
  });

  return NextResponse.json(createdGame, { status: 201 });
}
