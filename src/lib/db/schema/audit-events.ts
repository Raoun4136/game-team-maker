import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { groups } from "./groups";

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  // Audit records must survive entity deletion, so these stay as plain ids.
  partyId: uuid("party_id"),
  gameId: uuid("game_id"),
  memberId: uuid("member_id"),
  actorName: text("actor_name").notNull(),
  eventType: text("event_type").notNull(),
  changeSummary: text("change_summary").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
