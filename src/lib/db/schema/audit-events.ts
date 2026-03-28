import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { games } from "./games";
import { groups } from "./groups";
import { members } from "./members";
import { parties } from "./parties";

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  partyId: uuid("party_id").references(() => parties.id, { onDelete: "cascade" }),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, {
    onDelete: "cascade",
  }),
  actorName: text("actor_name").notNull(),
  eventType: text("event_type").notNull(),
  changeSummary: text("change_summary").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
