# Game Team Maker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP web app for shared-link Discord in-house match management with groups, members, parties, games, strict constraint-based random team generation, sensitive-action password protection, and group audit logs.

**Architecture:** Use a Next.js App Router application deployed on Vercel. Persist normalized game history in Postgres via a Vercel Marketplace integration such as Neon. Use Drizzle ORM for schema, migrations, and queries; keep group and party standings as derived queries from game history instead of stored counters.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Postgres via Neon on Vercel Marketplace, Drizzle ORM, Zod, Vitest, Playwright

---

## Stack Decision Notes

- Use Next.js App Router because it is the current recommended full-stack path in the official Next.js docs and gives us pages, layouts, and route handlers in one framework.
- Use Neon through the Vercel Marketplace because Vercel's current Postgres documentation says new projects should use a Marketplace Postgres provider and notes that legacy Vercel Postgres moved to Neon in December 2024.
- Use Drizzle because its official docs emphasize a SQL-like, serverless-ready approach that fits a normalized relational model and avoids over-abstracting the database.
- Use Zod only at request and form boundaries, not as an app-wide abstraction layer.

References:
- https://nextjs.org/docs/app/getting-started
- https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware
- https://vercel.com/docs/postgres
- https://vercel.com/docs/marketplace-storage
- https://vercel.com/marketplace/neon/
- https://orm.drizzle.team/docs/overview
- https://zod.dev/

### Task 1: Bootstrap the Next.js App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Scaffold the app**

Run:

```bash
pnpm create next-app@latest . --ts --eslint --tailwind --app --src-dir --use-pnpm --import-alias "@/*"
```

Expected:
- Next.js app scaffolded in the repository root
- `src/app` structure present

**Step 2: Add baseline environment examples**

Add this to `.env.example`:

```env
DATABASE_URL=
GROUP_PASSWORD_SESSION_MINUTES=30
```

**Step 3: Run the app**

Run:

```bash
pnpm dev
```

Expected:
- Local dev server starts
- Default app loads without runtime errors

**Step 4: Initialize git if needed**

Run:

```bash
git init
git add .
git commit -m "chore: bootstrap next app"
```

Expected:
- Repository initialized with a clean initial commit

### Task 2: Install Database and Validation Dependencies

**Files:**
- Modify: `package.json`
- Create: `src/lib/env.ts`
- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/schema/index.ts`
- Create: `drizzle.config.ts`

**Step 1: Install dependencies**

Run:

```bash
pnpm add drizzle-orm @neondatabase/serverless zod
pnpm add -D drizzle-kit dotenv
```

Expected:
- Database and validation dependencies added

**Step 2: Create environment loader**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GROUP_PASSWORD_SESSION_MINUTES: z.coerce.number().default(30),
});

export const env = envSchema.parse(process.env);
```

**Step 3: Create the DB client**

Create `src/lib/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/env";

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql);
```

**Step 4: Configure Drizzle**

Create `drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 5: Verify TypeScript**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected:
- No TypeScript errors

**Step 6: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml drizzle.config.ts src/lib/env.ts src/lib/db/index.ts .env.example
git commit -m "chore: add db and validation tooling"
```

### Task 3: Create the Relational Schema and First Migration

**Files:**
- Create: `src/lib/db/schema/groups.ts`
- Create: `src/lib/db/schema/members.ts`
- Create: `src/lib/db/schema/parties.ts`
- Create: `src/lib/db/schema/games.ts`
- Create: `src/lib/db/schema/audit-events.ts`
- Modify: `src/lib/db/schema/index.ts`
- Create: `drizzle/0000_initial.sql` via migration generation

**Step 1: Define `groups`**

Create `src/lib/db/schema/groups.ts` with:

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Step 2: Define `members` and party membership**

Include:
- `members` with `archivedAt`
- `partyMembers` join table

**Step 3: Define `parties`, `games`, `gameParticipants`, and `gameConstraints`**

Important columns:
- `parties.status`
- `games.team1Name`
- `games.team2Name`
- `games.winnerTeam`
- `gameParticipants.assignedTeam`
- `gameConstraints.constraintType`
- `gameConstraints.targetTeam`

**Step 4: Define audit events**

Create `src/lib/db/schema/audit-events.ts` with fields:
- `groupId`
- `partyId`
- `gameId`
- `memberId`
- `actorName`
- `eventType`
- `changeSummary`
- `payloadJson`
- `createdAt`

**Step 5: Export schema**

Create `src/lib/db/schema/index.ts`:

```ts
export * from "./groups";
export * from "./members";
export * from "./parties";
export * from "./games";
export * from "./audit-events";
```

**Step 6: Generate and apply migration**

Run:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Expected:
- Initial SQL migration created
- Database tables created successfully

**Step 7: Commit**

Run:

```bash
git add drizzle src/lib/db/schema
git commit -m "feat: add initial relational schema"
```

### Task 4: Implement Core Domain Logic for Constraints and Standings

**Files:**
- Create: `src/features/games/domain/types.ts`
- Create: `src/features/games/domain/constraints.ts`
- Create: `src/features/games/domain/generator.ts`
- Create: `src/features/games/domain/standings.ts`
- Create: `src/features/games/domain/__tests__/constraints.test.ts`
- Create: `src/features/games/domain/__tests__/generator.test.ts`
- Create: `src/features/games/domain/__tests__/standings.test.ts`
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install test tooling**

Run:

```bash
pnpm add -D vitest @vitest/coverage-v8
```

**Step 2: Define domain types**

Create `src/features/games/domain/types.ts` with:

```ts
export type TeamId = 1 | 2;

export type ConstraintType =
  | "same_team"
  | "different_team"
  | "pinned_team";

export type DraftConstraint =
  | { type: "same_team"; memberAId: string; memberBId: string }
  | { type: "different_team"; memberAId: string; memberBId: string }
  | { type: "pinned_team"; memberAId: string; targetTeam: TeamId };
```

**Step 3: Write failing validation tests**

Cover:
- conflicting same/different constraints
- duplicate pinned team conflicts
- impossible participant counts

**Step 4: Implement constraint validation**

Expose:

```ts
export function validateConstraints(
  memberIds: string[],
  constraints: DraftConstraint[],
): { ok: true } | { ok: false; reasons: string[] }
```

**Step 5: Write failing generator tests**

Cover:
- valid random assignment
- pinned team enforcement
- same-team enforcement
- different-team enforcement

**Step 6: Implement generator**

Expose:

```ts
export function generateValidTeams(
  memberIds: string[],
  constraints: DraftConstraint[],
): { team1: string[]; team2: string[] }
```

**Step 7: Write and implement standings tests**

Expose:

```ts
export function buildStandings(
  rows: Array<{ memberId: string; assignedTeam: TeamId; winnerTeam: TeamId | null }>,
): Map<string, { wins: number; losses: number; games: number }>
```

**Step 8: Run tests**

Run:

```bash
pnpm vitest run
```

Expected:
- All domain tests pass

**Step 9: Commit**

Run:

```bash
git add package.json vitest.config.ts src/features/games/domain
git commit -m "feat: add team generation domain logic"
```

### Task 5: Build Shared Server Utilities and Audit Logging

**Files:**
- Create: `src/lib/security/password.ts`
- Create: `src/lib/security/unlock-session.ts`
- Create: `src/lib/audit/log-event.ts`
- Create: `src/lib/slug.ts`
- Create: `src/lib/queries/standings.ts`
- Create: `src/lib/queries/groups.ts`

**Step 1: Install password dependency**

Run:

```bash
pnpm add bcryptjs
```

Expected:
- Password hashing dependency installed

**Step 2: Implement password helpers**

Create helpers:
- `hashGroupPassword(password: string)`
- `verifyGroupPassword(password: string, hash: string)`

**Step 3: Implement unlock-session cookie helpers**

Model:
- per-group signed or opaque unlock token
- expiration based on `GROUP_PASSWORD_SESSION_MINUTES`

**Step 4: Implement audit logger**

Expose:

```ts
export async function logAuditEvent(input: {
  groupId: string;
  actorName: string;
  eventType: string;
  changeSummary: string;
  partyId?: string;
  gameId?: string;
  memberId?: string;
  payloadJson?: unknown;
}): Promise<void>
```

**Step 5: Implement standings query helpers**

Create:
- `getGroupStandings(groupId: string)`
- `getPartyStandings(partyId: string)`

**Step 6: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml src/lib/security src/lib/audit src/lib/slug.ts src/lib/queries
git commit -m "feat: add security and audit utilities"
```

### Task 6: Build Route Handlers for Groups, Members, Parties, and Games

**Files:**
- Create: `src/app/api/groups/route.ts`
- Create: `src/app/api/groups/[slug]/route.ts`
- Create: `src/app/api/groups/[slug]/unlock/route.ts`
- Create: `src/app/api/groups/[slug]/members/route.ts`
- Create: `src/app/api/groups/[slug]/members/[memberId]/route.ts`
- Create: `src/app/api/groups/[slug]/parties/route.ts`
- Create: `src/app/api/groups/[slug]/parties/[partyId]/route.ts`
- Create: `src/app/api/groups/[slug]/parties/[partyId]/games/route.ts`
- Create: `src/app/api/groups/[slug]/parties/[partyId]/games/[gameId]/route.ts`
- Create: `src/app/api/groups/[slug]/audit/route.ts`

**Step 1: Add request schemas**

Use Zod inside handlers for:
- group creation
- member create/update/archive
- party create/end
- game create/update/delete
- result update
- unlock password request

**Step 2: Implement group create**

Behavior:
- accepts group name and optional password
- hashes password if present
- returns slug and summary

**Step 3: Implement member CRUD**

Behavior:
- create member
- update name/nickname
- archive member only after password unlock
- log all mutations

**Step 4: Implement party CRUD**

Behavior:
- create party
- end party
- manage party participant pool
- log all mutations

**Step 5: Implement game CRUD**

Behavior:
- create game from participant list
- validate constraints before generation/finalization
- update team names
- update assignments
- record winner
- edit winner only after password unlock
- delete game only after password unlock
- log all mutations

**Step 6: Implement audit list**

Behavior:
- list events newest first
- allow filters by event type and target type later

**Step 7: Add route tests for sensitive guards**

Create:
- `src/app/api/groups/[slug]/__tests__/unlock.test.ts`
- `src/app/api/groups/[slug]/__tests__/games.test.ts`

Cover:
- password required for result edit
- password required for game delete
- password required for member archive

**Step 8: Run tests**

Run:

```bash
pnpm vitest run
```

Expected:
- Domain and route tests pass

**Step 9: Commit**

Run:

```bash
git add src/app/api
git commit -m "feat: add group party game api routes"
```

### Task 7: Build the Shared App Shell and Group Landing Flow

**Files:**
- Create: `src/components/app-shell.tsx`
- Create: `src/components/editor-name-gate.tsx`
- Create: `src/components/group-create-form.tsx`
- Create: `src/components/nav-tabs.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/g/[slug]/layout.tsx`
- Create: `src/app/g/[slug]/page.tsx`

**Step 1: Replace placeholder homepage**

Homepage should:
- explain the product briefly
- create a group
- redirect into the group URL

**Step 2: Build editor name gate**

Behavior:
- read localStorage
- if missing, require entry before edit actions
- show current editor name in the shell

**Step 3: Build group layout**

Tabs:
- Overview
- Parties
- Members
- Logs

**Step 4: Add group overview**

Show:
- group name
- current unlock status
- group standings preview
- latest parties preview

**Step 5: Commit**

Run:

```bash
git add src/app src/components
git commit -m "feat: add app shell and group entry flow"
```

### Task 8: Build Members, Parties, and Logs Screens

**Files:**
- Create: `src/app/g/[slug]/members/page.tsx`
- Create: `src/app/g/[slug]/parties/page.tsx`
- Create: `src/app/g/[slug]/logs/page.tsx`
- Create: `src/components/members/member-list.tsx`
- Create: `src/components/members/member-form.tsx`
- Create: `src/components/parties/party-list.tsx`
- Create: `src/components/parties/party-form.tsx`
- Create: `src/components/logs/audit-log-table.tsx`

**Step 1: Build member management screen**

Features:
- create member
- edit member
- archive member with password gate
- hide archived members by default

**Step 2: Build party list/create screen**

Features:
- create party
- end party
- open party detail page

**Step 3: Build log screen**

Show:
- timestamp
- actor
- action
- target
- summary

**Step 4: Run manual smoke test**

Verify:
- create group
- add members
- archive member after unlock
- see archive event in logs

**Step 5: Commit**

Run:

```bash
git add src/app/g src/components/members src/components/parties src/components/logs
git commit -m "feat: add members parties and logs screens"
```

### Task 9: Build the Party Detail and Repeated Game Flow

**Files:**
- Create: `src/app/g/[slug]/parties/[partyId]/page.tsx`
- Create: `src/components/games/game-form.tsx`
- Create: `src/components/games/participant-picker.tsx`
- Create: `src/components/games/constraint-editor.tsx`
- Create: `src/components/games/team-generator.tsx`
- Create: `src/components/games/team-editor.tsx`
- Create: `src/components/games/game-history.tsx`
- Create: `src/components/games/party-standings.tsx`

**Step 1: Build party detail page**

Show:
- party metadata
- party participant pool
- party cumulative standings
- game history
- create next game action

**Step 2: Build next-game defaults**

Behavior:
- default selected participants from the previous game
- optional import of the previous game's constraints
- editable game name and team names

**Step 3: Build constraint editor**

Support:
- same team
- different team
- pinned to team 1
- pinned to team 2

**Step 4: Build random generation and validation UI**

Behavior:
- validate before generation
- block generation on conflict
- show clear conflict reasons

**Step 5: Build manual team editor**

Behavior:
- allow swaps and reassignment
- reject edits that violate constraints
- only finalize valid layouts

**Step 6: Build result and deletion flows**

Behavior:
- set winner team
- edit result only after unlock
- delete game only after unlock

**Step 7: Run manual smoke test**

Verify:
- create party
- create game from previous defaults
- reroll valid teams
- manually swap players without breaking constraints
- record winner
- edit winner after unlock
- delete game after unlock

**Step 8: Commit**

Run:

```bash
git add src/app/g/[slug]/parties/[partyId] src/components/games
git commit -m "feat: add party game management flow"
```

### Task 10: Add E2E Coverage and Deployment Readiness

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/group-flow.spec.ts`
- Modify: `package.json`
- Create: `README.md`

**Step 1: Install Playwright**

Run:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

**Step 2: Write one end-to-end happy path**

Cover:
- create group
- set editor name
- add members
- create party
- create game
- record result
- see party standings and logs

**Step 3: Add README**

Document:
- env vars
- dev commands
- migration commands
- Vercel + Neon setup

**Step 4: Run final verification**

Run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm vitest run
pnpm exec playwright test
pnpm build
```

Expected:
- lint passes
- typecheck passes
- unit tests pass
- e2e passes
- production build succeeds

**Step 5: Commit**

Run:

```bash
git add README.md package.json pnpm-lock.yaml playwright.config.ts tests/e2e
git commit -m "test: add e2e coverage and deployment docs"
```
