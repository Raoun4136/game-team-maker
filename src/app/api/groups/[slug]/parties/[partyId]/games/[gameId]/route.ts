import { and, eq, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
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
import { hasSensitiveUnlock } from "@/lib/server/group-auth";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; partyId: string; gameId: string }> },
) {
  const { slug, partyId, gameId } = await context.params;
  const editorName = getEditorName(request);
  const { group, party } = await requirePartyInGroup(slug, partyId);
  const db = getDb();
  const [existingGame] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.partyId, party.id)))
    .limit(1);

  if (!existingGame) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentParticipants = await db
    .select({ memberId: gameParticipants.memberId })
    .from(gameParticipants)
    .where(eq(gameParticipants.gameId, existingGame.id));

  if (existingGame.winnerTeam !== null && !hasSensitiveUnlock(slug, await cookies())) {
    return NextResponse.json(
      { error: "Editing a completed game requires the group password unlock." },
      { status: 403 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = gameUpsertSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid game update." },
      { status: 400 },
    );
  }

  const partyPool = await db
    .select({ memberId: partyMembers.memberId })
    .from(partyMembers)
    .where(eq(partyMembers.partyId, party.id));

  const partyPoolValidation = validateRequestedPartyPoolParticipants({
    requestedParticipantIds: parsed.data.participantIds,
    partyMemberIds: partyPool.map((member) => member.memberId),
    existingGameParticipantIds: currentParticipants.map(
      (participant) => participant.memberId,
    ),
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
    existingGameParticipantIds: currentParticipants.map(
      (participant) => participant.memberId,
    ),
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

  const [updatedGame] = await db
    .update(games)
    .set({
      name: parsed.data.name,
      team1Name: parsed.data.team1Name,
      team2Name: parsed.data.team2Name,
      winnerTeam: parsed.data.winnerTeam ?? null,
      updatedAt: new Date(),
    })
    .where(eq(games.id, existingGame.id))
    .returning({
      id: games.id,
      name: games.name,
      winnerTeam: games.winnerTeam,
    });

  await db.delete(gameParticipants).where(eq(gameParticipants.gameId, existingGame.id));
  await db.delete(gameConstraints).where(eq(gameConstraints.gameId, existingGame.id));

  await db.insert(gameParticipants).values(
    parsed.data.assignments.map((assignment) => ({
      gameId: existingGame.id,
      memberId: assignment.memberId,
      assignedTeam: assignment.teamId,
    })),
  );

  if (parsed.data.constraints.length > 0) {
    await db
      .insert(gameConstraints)
      .values(mapConstraintsForInsert(existingGame.id, parsed.data.constraints));
  }

  await logAuditEvent({
    groupId: group.id,
    partyId: party.id,
    gameId: existingGame.id,
    actorName: editorName,
    eventType:
      existingGame.winnerTeam === null && parsed.data.winnerTeam
        ? "game.result.recorded"
        : "game.updated",
    changeSummary:
      existingGame.winnerTeam === null && parsed.data.winnerTeam
        ? `Recorded the result for ${updatedGame.name}.`
        : `Updated game ${updatedGame.name}.`,
    payloadJson: {
      gameId: updatedGame.id,
      participantIds: parsed.data.participantIds,
      winnerTeam: updatedGame.winnerTeam,
    },
  });

  return NextResponse.json(updatedGame);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; partyId: string; gameId: string }> },
) {
  const { slug, partyId, gameId } = await context.params;
  const editorName = getEditorName(request);
  const { group, party } = await requirePartyInGroup(slug, partyId);
  const db = getDb();
  const [existingGame] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.partyId, party.id)))
    .limit(1);

  if (!existingGame) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  if (!hasSensitiveUnlock(slug, await cookies())) {
    return NextResponse.json(
      { error: "Deleting a game requires the group password unlock." },
      { status: 403 },
    );
  }

  await db.delete(games).where(eq(games.id, existingGame.id));

  await logAuditEvent({
    groupId: group.id,
    partyId: party.id,
    gameId: existingGame.id,
    actorName: editorName,
    eventType: "game.deleted",
    changeSummary: `Deleted game ${existingGame.name}.`,
    payloadJson: {
      gameId: existingGame.id,
      winnerTeam: existingGame.winnerTeam,
    },
  });

  return NextResponse.json({ ok: true });
}
