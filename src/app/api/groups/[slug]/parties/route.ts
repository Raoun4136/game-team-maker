import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/log-event";
import { getDb } from "@/lib/db";
import { parties } from "@/lib/db/schema";
import { getEditorName, requireGroupBySlug } from "@/lib/server/mutation-helpers";

const createPartySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const editorName = getEditorName(request);
  const group = await requireGroupBySlug(slug);
  const payload = await request.json().catch(() => null);
  const parsed = createPartySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid party payload." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [createdParty] = await db
    .insert(parties)
    .values({
      groupId: group.id,
      name: parsed.data.name,
      createdByName: editorName,
    })
    .returning({
      id: parties.id,
      name: parties.name,
      status: parties.status,
      startedAt: parties.startedAt,
      endedAt: parties.endedAt,
      createdAt: parties.createdAt,
    });

  await logAuditEvent({
    groupId: group.id,
    partyId: createdParty.id,
    actorName: editorName,
    eventType: "party.created",
    changeSummary: `Created party ${createdParty.name}.`,
    payloadJson: createdParty,
  });

  return NextResponse.json(createdParty, { status: 201 });
}
