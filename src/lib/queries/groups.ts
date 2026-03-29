import { and, desc, eq, isNull } from "drizzle-orm";
import { isNotNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { normalizeGroupSlug } from "@/lib/group-slug";
import { auditEvents, groups, members } from "@/lib/db/schema";

export async function getGroupBySlug(slug: string) {
  const db = getDb();
  const normalizedSlug = normalizeGroupSlug(slug);

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .where(eq(groups.slug, normalizedSlug))
    .limit(1);

  return group ?? null;
}

export async function listGroupAuditEvents(slug: string) {
  const group = await getGroupBySlug(slug);

  if (!group) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: auditEvents.id,
      actorName: auditEvents.actorName,
      eventType: auditEvents.eventType,
      changeSummary: auditEvents.changeSummary,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.groupId, group.id))
    .orderBy(desc(auditEvents.createdAt));
}

export async function listActiveMembers(slug: string) {
  const group = await getGroupBySlug(slug);

  if (!group) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: members.id,
      name: members.name,
      nickname: members.nickname,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(and(eq(members.groupId, group.id), isNull(members.archivedAt)))
    .orderBy(members.createdAt);
}

export async function listArchivedMembers(slug: string) {
  const group = await getGroupBySlug(slug);

  if (!group) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: members.id,
      name: members.name,
      nickname: members.nickname,
      archivedAt: members.archivedAt,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(and(eq(members.groupId, group.id), isNotNull(members.archivedAt)))
    .orderBy(desc(members.archivedAt));
}
