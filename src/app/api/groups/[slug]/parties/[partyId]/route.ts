import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/log-event";
import { getDb } from "@/lib/db";
import { parties } from "@/lib/db/schema";
import { getEditorName, requirePartyInGroup } from "@/lib/server/mutation-helpers";

const updatePartySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["active", "ended"]).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; partyId: string }> },
) {
  const { slug, partyId } = await context.params;
  const editorName = getEditorName(request);
  const { group, party } = await requirePartyInGroup(slug, partyId);
  const payload = await request.json().catch(() => null);
  const parsed = updatePartySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid party update." },
      { status: 400 },
    );
  }

  const nextStatus = parsed.data.status ?? party.status;
  const db = getDb();
  const [updatedParty] = await db
    .update(parties)
    .set({
      name: parsed.data.name ?? party.name,
      status: nextStatus,
      endedAt: nextStatus === "ended" ? new Date() : party.endedAt,
      updatedAt: new Date(),
    })
    .where(eq(parties.id, party.id))
    .returning({
      id: parties.id,
      name: parties.name,
      status: parties.status,
      startedAt: parties.startedAt,
      endedAt: parties.endedAt,
    });

  await logAuditEvent({
    groupId: group.id,
    partyId: updatedParty.id,
    actorName: editorName,
    eventType: parsed.data.status === "ended" ? "party.ended" : "party.updated",
    changeSummary:
      parsed.data.status === "ended"
        ? `Ended party ${updatedParty.name}.`
        : `Updated party ${updatedParty.name}.`,
    payloadJson: updatedParty,
  });

  return NextResponse.json(updatedParty);
}
