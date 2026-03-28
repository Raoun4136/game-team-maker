import { z } from "zod";

const appEnvSchema = z.object({
  GROUP_PASSWORD_SESSION_MINUTES: z.coerce.number().default(30),
});

export const appEnv = appEnvSchema.parse({
  GROUP_PASSWORD_SESSION_MINUTES: process.env.GROUP_PASSWORD_SESSION_MINUTES,
});

export function getDatabaseUrl() {
  const parsed = z
    .string()
    .min(1, "DATABASE_URL must be set before using the database.")
    .safeParse(process.env.DATABASE_URL);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "DATABASE_URL is missing.");
  }

  return parsed.data;
}
