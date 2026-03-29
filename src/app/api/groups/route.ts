import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit/log-event";
import { hashGroupPassword } from "@/lib/security/password";
import { slugifyGroupName } from "@/lib/slug";

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(50),
  password: z.string().trim().min(4).max(100),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request payload.",
      },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const passwordHash = await hashGroupPassword(parsed.data.password);

    const [createdGroup] = await db
      .insert(groups)
      .values({
        name: parsed.data.name,
        slug: slugifyGroupName(parsed.data.name),
        passwordHash,
      })
      .returning({
        id: groups.id,
        name: groups.name,
        slug: groups.slug,
      });

    await logAuditEvent({
      groupId: createdGroup.id,
      actorName: "System",
      eventType: "group.created",
      changeSummary: `Created group ${createdGroup.name}.`,
      payloadJson: createdGroup,
    });

    return NextResponse.json(createdGroup, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create group.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
