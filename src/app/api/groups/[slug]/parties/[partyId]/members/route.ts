import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/log-event";
import { getDb } from "@/lib/db";
import { members, partyMembers } from "@/lib/db/schema";
import { getEditorName, requirePartyInGroup } from "@/lib/server/mutation-helpers";

const syncPartyMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string; partyId: string }> },
) {
  const { slug, partyId } = await context.params;
  const editorName = getEditorName(request);
  const { group, party } = await requirePartyInGroup(slug, partyId);
  const payload = await request.json().catch(() => null);
  const parsed = syncPartyMembersSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid party member payload." },
      { status: 400 },
    );
  }

  if (party.status !== "active") {
    return NextResponse.json(
      { error: "Ended parties can no longer change their participant pool." },
      { status: 409 },
    );
  }

  const db = getDb();
  const activeMembers =
    parsed.data.memberIds.length === 0
      ? []
      : await db
          .select({ id: members.id })
          .from(members)
          .where(
            and(
              eq(members.groupId, group.id),
              inArray(members.id, parsed.data.memberIds),
              isNull(members.archivedAt),
            ),
          );

  const allowedMemberIds = new Set(activeMembers.map((member) => member.id));

  if (allowedMemberIds.size !== parsed.data.memberIds.length) {
    return NextResponse.json(
      { error: "Party members must belong to the group and remain active." },
      { status: 400 },
    );
  }

  await db.delete(partyMembers).where(eq(partyMembers.partyId, party.id));

  if (parsed.data.memberIds.length > 0) {
    await db.insert(partyMembers).values(
      parsed.data.memberIds.map((memberId) => ({
        partyId: party.id,
        memberId,
        addedByName: editorName,
      })),
    );
  }

  await logAuditEvent({
    groupId: group.id,
    partyId: party.id,
    actorName: editorName,
    eventType: "party.members.synced",
    changeSummary: `Updated the participant pool for ${party.name}.`,
    payloadJson: {
      memberIds: parsed.data.memberIds,
    },
  });

  return NextResponse.json({ ok: true, memberIds: parsed.data.memberIds });
}
