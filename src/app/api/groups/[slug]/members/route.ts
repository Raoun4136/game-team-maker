import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/log-event";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { getEditorName, requireGroupBySlug } from "@/lib/server/mutation-helpers";

const createMemberSchema = z.object({
  name: z.string().trim().min(1).max(40),
  nickname: z.string().trim().min(1).max(40),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const editorName = getEditorName(request);
  const group = await requireGroupBySlug(slug);
  const payload = await request.json().catch(() => null);
  const parsed = createMemberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid member payload." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [createdMember] = await db
    .insert(members)
    .values({
      groupId: group.id,
      name: parsed.data.name,
      nickname: parsed.data.nickname,
    })
    .returning({
      id: members.id,
      name: members.name,
      nickname: members.nickname,
    });

  await logAuditEvent({
    groupId: group.id,
    memberId: createdMember.id,
    actorName: editorName,
    eventType: "member.created",
    changeSummary: `Added member ${createdMember.name} (${createdMember.nickname}).`,
    payloadJson: createdMember,
  });

  return NextResponse.json(createdMember, { status: 201 });
}
