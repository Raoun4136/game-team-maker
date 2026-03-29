import { z } from "zod";

export const constraintSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("same_team"),
    memberAId: z.string().uuid(),
    memberBId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("different_team"),
    memberAId: z.string().uuid(),
    memberBId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("pinned_team"),
    memberAId: z.string().uuid(),
    targetTeam: z.union([z.literal(1), z.literal(2)]),
  }),
]);

export const teamAssignmentSchema = z.object({
  memberId: z.string().uuid(),
  teamId: z.union([z.literal(1), z.literal(2)]),
});

export const gameUpsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  team1Name: z.string().trim().min(1).max(40),
  team2Name: z.string().trim().min(1).max(40),
  participantIds: z
    .array(z.string().uuid())
    .min(2)
    .refine(
      (participantIds) => participantIds.length % 2 === 0,
      "Two-team mode requires an even number of participants.",
    ),
  constraints: z.array(constraintSchema),
  assignments: z.array(teamAssignmentSchema),
  winnerTeam: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
});

export type GameUpsertInput = z.infer<typeof gameUpsertSchema>;
