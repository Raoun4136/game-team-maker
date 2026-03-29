import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { groups, parties } from "@/lib/db/schema";
import { decodeEditorNameHeader } from "@/lib/editor-name-header";
import { normalizeGroupSlug } from "@/lib/group-slug";

export function getEditorName(request: Request) {
  const encodedEditorName = request.headers.get("x-editor-name");
  const editorName = encodedEditorName
    ? decodeEditorNameHeader(encodedEditorName)
    : "";

  if (!editorName) {
    throw new Error("An editor name is required before making changes.");
  }

  return editorName;
}

export async function requireGroupBySlug(slug: string) {
  const db = getDb();
  const normalizedSlug = normalizeGroupSlug(slug);

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, normalizedSlug))
    .limit(1);

  if (!group) {
    throw new Error("Group not found.");
  }

  return group;
}

export async function requirePartyInGroup(slug: string, partyId: string) {
  const db = getDb();
  const group = await requireGroupBySlug(slug);

  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.groupId, group.id)))
    .limit(1);

  if (!party) {
    throw new Error("Party not found.");
  }

  return { group, party };
}
