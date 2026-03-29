import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/log-event";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { hasSensitiveUnlock } from "@/lib/server/group-auth";
import { getEditorName, requireGroupBySlug } from "@/lib/server/mutation-helpers";

const updateMemberSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  nickname: z.string().trim().min(1).max(40).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; memberId: string }> },
) {
  const { slug, memberId } = await context.params;
  const editorName = getEditorName(request);
  const group = await requireGroupBySlug(slug);
  const payload = await request.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid member update." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [existingMember] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, group.id)))
    .limit(1);

  if (!existingMember) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (parsed.data.archived && !hasSensitiveUnlock(slug, await cookies())) {
    return NextResponse.json(
      { error: "This action requires the group password unlock." },
      { status: 403 },
    );
  }

  const [updatedMember] = await db
    .update(members)
    .set({
      name: parsed.data.name ?? existingMember.name,
      nickname: parsed.data.nickname ?? existingMember.nickname,
      archivedAt:
        parsed.data.archived === undefined
          ? existingMember.archivedAt
          : parsed.data.archived
            ? new Date()
            : null,
      updatedAt: new Date(),
    })
    .where(eq(members.id, existingMember.id))
    .returning({
      id: members.id,
      name: members.name,
      nickname: members.nickname,
      archivedAt: members.archivedAt,
    });

  await logAuditEvent({
    groupId: group.id,
    memberId: updatedMember.id,
    actorName: editorName,
    eventType: parsed.data.archived ? "member.archived" : "member.updated",
    changeSummary: parsed.data.archived
      ? `Archived member ${updatedMember.name}.`
      : `Updated member ${updatedMember.name}.`,
    payloadJson: updatedMember,
  });

  return NextResponse.json(updatedMember);
}
