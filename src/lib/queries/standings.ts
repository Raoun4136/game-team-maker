import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { gameParticipants, games, members, parties } from "@/lib/db/schema";

type StandingRow = {
  memberId: string;
  memberName: string;
  memberNickname: string;
  wins: number;
  losses: number;
  games: number;
};

function reduceStandings(
  rows: Array<{
    memberId: string;
    memberName: string;
    memberNickname: string;
    assignedTeam: number;
    winnerTeam: number | null;
  }>,
) {
  const standings = new Map<string, StandingRow>();

  for (const row of rows) {
    const existing =
      standings.get(row.memberId) ??
      {
        memberId: row.memberId,
        memberName: row.memberName,
        memberNickname: row.memberNickname,
        wins: 0,
        losses: 0,
        games: 0,
      };

    existing.games += 1;

    if (row.winnerTeam === row.assignedTeam) {
      existing.wins += 1;
    } else {
      existing.losses += 1;
    }

    standings.set(row.memberId, existing);
  }

  return [...standings.values()].sort(
    (left, right) =>
      right.wins - left.wins ||
      left.losses - right.losses ||
      left.memberName.localeCompare(right.memberName),
  );
}

export async function getGroupStandings(groupId: string) {
  const db = getDb();

  const rows = await db
    .select({
      memberId: members.id,
      memberName: members.name,
      memberNickname: members.nickname,
      assignedTeam: gameParticipants.assignedTeam,
      winnerTeam: games.winnerTeam,
    })
    .from(gameParticipants)
    .innerJoin(games, eq(gameParticipants.gameId, games.id))
    .innerJoin(parties, eq(games.partyId, parties.id))
    .innerJoin(members, eq(gameParticipants.memberId, members.id))
    .where(and(eq(parties.groupId, groupId), isNotNull(games.winnerTeam)));

  return reduceStandings(rows);
}

export async function getPartyStandings(partyId: string) {
  const db = getDb();

  const rows = await db
    .select({
      memberId: members.id,
      memberName: members.name,
      memberNickname: members.nickname,
      assignedTeam: gameParticipants.assignedTeam,
      winnerTeam: games.winnerTeam,
    })
    .from(gameParticipants)
    .innerJoin(games, eq(gameParticipants.gameId, games.id))
    .innerJoin(members, eq(gameParticipants.memberId, members.id))
    .where(and(eq(games.partyId, partyId), isNotNull(games.winnerTeam)));

  return reduceStandings(rows);
}

export async function getPartyStandingsByGameIds(gameIds: string[]) {
  if (gameIds.length === 0) {
    return [];
  }

  const db = getDb();

  const rows = await db
    .select({
      memberId: members.id,
      memberName: members.name,
      memberNickname: members.nickname,
      assignedTeam: gameParticipants.assignedTeam,
      winnerTeam: games.winnerTeam,
    })
    .from(gameParticipants)
    .innerJoin(games, eq(gameParticipants.gameId, games.id))
    .innerJoin(members, eq(gameParticipants.memberId, members.id))
    .where(and(inArray(games.id, gameIds), isNotNull(games.winnerTeam)));

  return reduceStandings(rows);
}
