import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "@/lib/env";

declare global {
  var __gameTeamMakerDb: ReturnType<typeof drizzle> | undefined;
}

export function getDb() {
  if (globalThis.__gameTeamMakerDb) {
    return globalThis.__gameTeamMakerDb;
  }

  const sql = neon(getDatabaseUrl());
  const db = drizzle(sql);

  globalThis.__gameTeamMakerDb = db;

  return db;
}
