import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { DraftConstraint } from "@/features/games/domain/generator";
import { getDb } from "@/lib/db";
import {
  gameConstraints,
  gameParticipants,
  games,
  members,
  parties,
  partyMembers,
} from "@/lib/db/schema";
import { getGroupBySlug } from "@/lib/queries/groups";

type PartyGameRecord = {
  id: string;
  name: string;
  team1Name: string;
  team2Name: string;
  winnerTeam: number | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    memberId: string;
    memberName: string;
    memberNickname: string;
    assignedTeam: number;
  }>;
  constraints: DraftConstraint[];
};

function mapConstraintRows(
  rows: Array<{
    constraintType: string;
    memberAId: string;
    memberBId: string | null;
    targetTeam: number | null;
  }>,
): DraftConstraint[] {
  const mapped: DraftConstraint[] = [];

  for (const row of rows) {
    if (row.constraintType === "same_team" && row.memberBId) {
      mapped.push({
        type: "same_team",
        memberAId: row.memberAId,
        memberBId: row.memberBId,
      });
      continue;
    }

    if (row.constraintType === "different_team" && row.memberBId) {
      mapped.push({
        type: "different_team",
        memberAId: row.memberAId,
        memberBId: row.memberBId,
      });
      continue;
    }

    if (row.constraintType === "pinned_team" && row.targetTeam) {
      mapped.push({
        type: "pinned_team",
        memberAId: row.memberAId,
        targetTeam: row.targetTeam as 1 | 2,
      });
    }
  }

  return mapped;
}

export async function listPartiesByGroup(slug: string) {
  const group = await getGroupBySlug(slug);

  if (!group) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: parties.id,
      name: parties.name,
      status: parties.status,
      startedAt: parties.startedAt,
      endedAt: parties.endedAt,
      createdAt: parties.createdAt,
    })
    .from(parties)
    .where(eq(parties.groupId, group.id))
    .orderBy(desc(parties.createdAt));
}

export async function getPartyById(slug: string, partyId: string) {
  const group = await getGroupBySlug(slug);

  if (!group) {
    return null;
  }

  const db = getDb();

  const [party] = await db
    .select({
      id: parties.id,
      groupId: parties.groupId,
      name: parties.name,
      status: parties.status,
      startedAt: parties.startedAt,
      endedAt: parties.endedAt,
      createdAt: parties.createdAt,
    })
    .from(parties)
    .where(and(eq(parties.groupId, group.id), eq(parties.id, partyId)))
    .limit(1);

  return party ?? null;
}

export async function listPartyMembers(partyId: string) {
  const db = getDb();

  return db
    .select({
      memberId: members.id,
      name: members.name,
      nickname: members.nickname,
    })
    .from(partyMembers)
    .innerJoin(members, eq(partyMembers.memberId, members.id))
    .where(eq(partyMembers.partyId, partyId))
    .orderBy(asc(members.name));
}

export async function listPartyGames(partyId: string): Promise<PartyGameRecord[]> {
  const db = getDb();
  const gameRows = await db
    .select({
      id: games.id,
      name: games.name,
      team1Name: games.team1Name,
      team2Name: games.team2Name,
      winnerTeam: games.winnerTeam,
      createdAt: games.createdAt,
      updatedAt: games.updatedAt,
    })
    .from(games)
    .where(eq(games.partyId, partyId))
    .orderBy(desc(games.createdAt));

  if (gameRows.length === 0) {
    return [];
  }

  const gameIds = gameRows.map((game) => game.id);

  const [participantRows, constraintRows] = await Promise.all([
    db
      .select({
        gameId: gameParticipants.gameId,
        memberId: members.id,
        memberName: members.name,
        memberNickname: members.nickname,
        assignedTeam: gameParticipants.assignedTeam,
      })
      .from(gameParticipants)
      .innerJoin(members, eq(gameParticipants.memberId, members.id))
      .where(inArray(gameParticipants.gameId, gameIds)),
    db
      .select({
        gameId: gameConstraints.gameId,
        constraintType: gameConstraints.constraintType,
        memberAId: gameConstraints.memberAId,
        memberBId: gameConstraints.memberBId,
        targetTeam: gameConstraints.targetTeam,
      })
      .from(gameConstraints)
      .where(inArray(gameConstraints.gameId, gameIds)),
  ]);

  return gameRows.map((game) => ({
    ...game,
    participants: participantRows
      .filter((participant) => participant.gameId === game.id)
      .map((participant) => ({
        memberId: participant.memberId,
        memberName: participant.memberName,
        memberNickname: participant.memberNickname,
        assignedTeam: participant.assignedTeam,
      })),
    constraints: mapConstraintRows(
      constraintRows
        .filter((constraint) => constraint.gameId === game.id)
        .map((constraint) => ({
          constraintType: constraint.constraintType,
          memberAId: constraint.memberAId,
          memberBId: constraint.memberBId,
          targetTeam: constraint.targetTeam,
        })),
    ),
  }));
}
