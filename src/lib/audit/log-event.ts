import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

type AuditEventInput = {
  groupId: string;
  actorName: string;
  eventType: string;
  changeSummary: string;
  partyId?: string;
  gameId?: string;
  memberId?: string;
  payloadJson?: unknown;
};

export async function logAuditEvent(input: AuditEventInput) {
  const db = getDb();

  await db.insert(auditEvents).values({
    groupId: input.groupId,
    actorName: input.actorName,
    eventType: input.eventType,
    changeSummary: input.changeSummary,
    partyId: input.partyId,
    gameId: input.gameId,
    memberId: input.memberId,
    payloadJson: input.payloadJson,
  });
}
