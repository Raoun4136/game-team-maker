import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { members } from "./members";
import { parties } from "./parties";

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  partyId: uuid("party_id")
    .notNull()
    .references(() => parties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  team1Name: text("team_1_name").notNull(),
  team2Name: text("team_2_name").notNull(),
  winnerTeam: integer("winner_team"),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameParticipants = pgTable("game_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  assignedTeam: integer("assigned_team").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameConstraints = pgTable("game_constraints", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  constraintType: text("constraint_type").notNull(),
  memberAId: uuid("member_a_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  memberBId: uuid("member_b_id").references(() => members.id, {
    onDelete: "cascade",
  }),
  targetTeam: integer("target_team"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
