import { desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { auditEvents, games, groups, members, parties } from "@/lib/db/schema";

export async function getAdminSummary() {
  const db = getDb();

  const [
    [groupTotals],
    [activeMemberTotals],
    [archivedMemberTotals],
    [partyTotals],
    [activePartyTotals],
    [gameTotals],
    [auditTotals],
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(groups),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(members)
      .where(isNull(members.archivedAt)),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(members)
      .where(sql`${members.archivedAt} is not null`),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(parties),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(parties)
      .where(eq(parties.status, "active")),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(games),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(auditEvents),
  ]);

  return {
    groups: groupTotals?.count ?? 0,
    activeMembers: activeMemberTotals?.count ?? 0,
    archivedMembers: archivedMemberTotals?.count ?? 0,
    parties: partyTotals?.count ?? 0,
    activeParties: activePartyTotals?.count ?? 0,
    games: gameTotals?.count ?? 0,
    auditEvents: auditTotals?.count ?? 0,
  };
}

export async function listAdminGroups() {
  const db = getDb();

  const [groupRows, memberCounts, partyCounts, gameCounts, lastEventRows] =
    await Promise.all([
      db
        .select({
          id: groups.id,
          name: groups.name,
          slug: groups.slug,
          createdAt: groups.createdAt,
        })
        .from(groups)
        .orderBy(desc(groups.createdAt)),
      db
        .select({
          groupId: members.groupId,
          activeCount:
            sql<number>`count(*) filter (where ${members.archivedAt} is null)`.mapWith(
              Number,
            ),
          archivedCount:
            sql<number>`count(*) filter (where ${members.archivedAt} is not null)`.mapWith(
              Number,
            ),
        })
        .from(members)
        .groupBy(members.groupId),
      db
        .select({
          groupId: parties.groupId,
          totalCount: sql<number>`count(*)`.mapWith(Number),
          activeCount:
            sql<number>`count(*) filter (where ${parties.status} = 'active')`.mapWith(
              Number,
            ),
        })
        .from(parties)
        .groupBy(parties.groupId),
      db
        .select({
          groupId: parties.groupId,
          gameCount: sql<number>`count(*)`.mapWith(Number),
        })
        .from(games)
        .innerJoin(parties, eq(games.partyId, parties.id))
        .groupBy(parties.groupId),
      db
        .select({
          groupId: auditEvents.groupId,
          lastEventAt: sql<Date>`max(${auditEvents.createdAt})`,
        })
        .from(auditEvents)
        .groupBy(auditEvents.groupId),
    ]);

  const memberCountByGroupId = new Map(
    memberCounts.map((row) => [row.groupId, row]),
  );
  const partyCountByGroupId = new Map(
    partyCounts.map((row) => [row.groupId, row]),
  );
  const gameCountByGroupId = new Map(
    gameCounts.map((row) => [row.groupId, row.gameCount]),
  );
  const lastEventByGroupId = new Map(
    lastEventRows.map((row) => [row.groupId, row.lastEventAt]),
  );

  return groupRows.map((group) => {
    const memberCount = memberCountByGroupId.get(group.id);
    const partyCount = partyCountByGroupId.get(group.id);

    return {
      ...group,
      activeMembers: memberCount?.activeCount ?? 0,
      archivedMembers: memberCount?.archivedCount ?? 0,
      parties: partyCount?.totalCount ?? 0,
      activeParties: partyCount?.activeCount ?? 0,
      games: gameCountByGroupId.get(group.id) ?? 0,
      lastEventAt: lastEventByGroupId.get(group.id) ?? null,
    };
  });
}

export async function listRecentAdminAuditEvents(limit = 20) {
  const db = getDb();

  return db
    .select({
      id: auditEvents.id,
      actorName: auditEvents.actorName,
      eventType: auditEvents.eventType,
      changeSummary: auditEvents.changeSummary,
      createdAt: auditEvents.createdAt,
      groupName: groups.name,
      groupSlug: groups.slug,
    })
    .from(auditEvents)
    .innerJoin(groups, eq(auditEvents.groupId, groups.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export async function listRecentAdminParties(limit = 12) {
  const db = getDb();

  return db
    .select({
      id: parties.id,
      name: parties.name,
      status: parties.status,
      startedAt: parties.startedAt,
      endedAt: parties.endedAt,
      groupName: groups.name,
      groupSlug: groups.slug,
    })
    .from(parties)
    .innerJoin(groups, eq(parties.groupId, groups.id))
    .orderBy(desc(parties.updatedAt))
    .limit(limit);
}
