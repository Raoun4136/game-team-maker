# Game Team Maker Focused UX Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the app so each screen has one primary purpose and all user-facing terminology is consistent.

**Architecture:** Split the current party-centric operating surface into route-aligned screens: group summary, members, parties, party detail, new game, and game detail. Reuse the existing data model and route handlers where possible, then move UI responsibilities and local state to screen-specific components.

**Tech Stack:** Next.js App Router, React, TypeScript, Drizzle, Vitest, existing smoke tests

---

### Task 1: Lock the new UX spec into project docs

**Files:**
- Create: `docs/plans/2026-03-30-game-team-maker-focused-ux-design.md`
- Create: `docs/plans/2026-03-30-game-team-maker-focused-ux-implementation.md`

**Step 1: Check in the approved design**

Write the focused UX design with:

- fixed vocabulary
- new route responsibilities
- party detail vs new game vs game detail split
- protected-action placement

**Step 2: Save the implementation plan**

Include the target files, route split, testing strategy, and migration order.

**Step 3: Commit**

Run:

```bash
git add docs/plans/2026-03-30-game-team-maker-focused-ux-design.md docs/plans/2026-03-30-game-team-maker-focused-ux-implementation.md
git commit -m "docs: define focused UX refactor"
```

### Task 2: Normalize user-facing terminology

**Files:**
- Modify: `src/components/parties-manager.tsx`
- Modify: `src/components/party-workspace.tsx`
- Modify: `src/components/nav-tabs.tsx`
- Modify: `src/app/g/[slug]/page.tsx`
- Modify: `src/app/g/[slug]/logs/page.tsx`
- Modify: `src/components/admin-dashboard.tsx`
- Search: `src/`

**Step 1: Write the failing copy assertions**

Add or update tests that verify old UI terms do not render where the new terms
should appear.

Targets to remove from UI copy:

- `세션`
- `워크스페이스`
- `라운드`
- `참가자 풀`

**Step 2: Run the relevant tests**

Run:

```bash
pnpm test
```

Expected: fail or show missing coverage for the new copy rules.

**Step 3: Replace user-facing terms**

Use:

- `그룹`
- `파티`
- `게임`
- `멤버`
- `팀 편성`
- `기록`

Keep internal variable names stable when a rename would create unnecessary risk.

**Step 4: Re-run tests**

Run:

```bash
pnpm test
```

Expected: pass with updated expectations.

**Step 5: Commit**

```bash
git add src
git commit -m "refactor: normalize focused UX terminology"
```

### Task 3: Reduce the group page to summary and navigation

**Files:**
- Modify: `src/app/g/[slug]/page.tsx`
- Modify: `src/app/g/[slug]/layout.tsx`
- Modify: `src/components/nav-tabs.tsx`
- Possibly create: `src/components/group-summary/*.tsx`
- Test: existing smoke coverage plus route rendering tests

**Step 1: Add a failing test or assertion**

Verify the group page no longer contains direct create/edit controls for parties
or games.

**Step 2: Remove the action-hub behavior**

Keep:

- summary cards
- recent activity
- navigation links to the current or latest party

Remove:

- direct operational forms
- overloaded attention stack

**Step 3: Verify rendering**

Run:

```bash
pnpm test
pnpm build
```

Expected: group page still renders and links remain valid.

**Step 4: Commit**

```bash
git add src/app/g/[slug]/page.tsx src/app/g/[slug]/layout.tsx src/components/nav-tabs.tsx src/components/group-summary
git commit -m "refactor: simplify group summary flow"
```

### Task 4: Keep the parties page focused on selecting and creating parties

**Files:**
- Modify: `src/app/g/[slug]/parties/page.tsx`
- Modify: `src/components/parties-manager.tsx`
- Test: smoke and page assertions

**Step 1: Write a failing test**

Assert the parties page contains:

- create party
- active party
- ended party list

and does not present game-builder controls.

**Step 2: Simplify the screen**

Ensure the page only supports:

- create
- open
- end

Do not expose detailed game editing on this screen.

**Step 3: Verify**

Run:

```bash
pnpm test
pnpm test:smoke
```

Expected: parties flow still works.

**Step 4: Commit**

```bash
git add src/app/g/[slug]/parties/page.tsx src/components/parties-manager.tsx
git commit -m "refactor: focus parties page on party selection"
```

### Task 5: Split party detail away from the game builder

**Files:**
- Modify: `src/app/g/[slug]/parties/[partyId]/page.tsx`
- Replace or shrink: `src/components/party-workspace.tsx`
- Create: `src/components/party-detail/*.tsx`
- Test: route tests and smoke flow

**Step 1: Write the failing test**

Assert party detail shows:

- party info
- party standings
- party members
- saved game list
- new game link

and does not render the full game-creation form inline.

**Step 2: Build a narrow party-detail surface**

Move the game-builder logic out of this page.

Keep this page responsible for:

- party metadata
- editable party members if active
- game list
- links to create or open a game

**Step 3: Verify**

Run:

```bash
pnpm test
pnpm build
```

Expected: party detail stays functional and route data still loads.

**Step 4: Commit**

```bash
git add src/app/g/[slug]/parties/[partyId]/page.tsx src/components/party-workspace.tsx src/components/party-detail
git commit -m "refactor: split party detail from game builder"
```

### Task 6: Add a dedicated new-game route and screen

**Files:**
- Create: `src/app/g/[slug]/parties/[partyId]/games/new/page.tsx`
- Create: `src/components/new-game/*.tsx`
- Reuse or move logic from: `src/components/party-workspace.tsx`
- Possibly create helpers under: `src/features/games/`
- Test: new route rendering and game creation flow

**Step 1: Write the failing test**

Assert the new route renders:

- game name
- team names
- members section
- previous setup import
- options
- team formation
- save action

**Step 2: Move the create-game state here**

Keep the default behaviors:

- use previous game members when available
- allow previous option import
- enforce option conflicts
- enforce team-formation validity

**Step 3: Verify**

Run:

```bash
pnpm test
pnpm test:smoke
```

Expected: create-game flow passes through the new route.

**Step 4: Commit**

```bash
git add src/app/g/[slug]/parties/[partyId]/games/new/page.tsx src/components/new-game src/features/games
git commit -m "feat: add dedicated new game flow"
```

### Task 7: Add a dedicated saved-game detail route

**Files:**
- Create or modify: `src/app/g/[slug]/parties/[partyId]/games/[gameId]/page.tsx`
- Create: `src/components/game-detail/*.tsx`
- Reuse result and protected-action logic from current surfaces
- Test: edit/result/delete flows

**Step 1: Write the failing test**

Assert the saved-game route renders:

- game info
- team formation
- options
- result block
- delete action

**Step 2: Move saved-game management here**

This route owns:

- editing saved team formation
- result record
- result modification
- game deletion
- inline unlock prompt for blocked actions

**Step 3: Verify**

Run:

```bash
pnpm test
pnpm test:smoke
```

Expected: completed-game protections still work from the new route.

**Step 4: Commit**

```bash
git add src/app/g/[slug]/parties/[partyId]/games/[gameId]/page.tsx src/components/game-detail
git commit -m "feat: add dedicated game detail flow"
```

### Task 8: Move unlock prompts next to protected actions

**Files:**
- Modify: `src/components/unlock-panel.tsx`
- Modify: new game-detail and members components
- Modify: `src/lib/server/group-auth.ts` only if helper shape needs minor changes
- Test: unlock and protection coverage

**Step 1: Write the failing test**

Assert blocked actions expose a local unlock path or clear blocked-state message
instead of relying on a detached page-top prompt.

**Step 2: Rescope the unlock UI**

Keep the same security model, but show unlock affordances:

- next to archive member
- next to result modification
- next to delete game

**Step 3: Verify**

Run:

```bash
pnpm test
pnpm test:smoke
```

Expected: protection still blocks until unlock succeeds.

**Step 4: Commit**

```bash
git add src/components/unlock-panel.tsx src/components/members-manager.tsx src/components/game-detail src/lib/server/group-auth.ts
git commit -m "refactor: localize protected action unlock prompts"
```

### Task 9: Replace page-wide message strings with section-local status state

**Files:**
- Modify: any client forms touched in the refactor
- Possibly create: `src/components/status/*`
- Test: component behavior and smoke tests

**Step 1: Write the failing test**

Cover one or two key surfaces where unrelated actions currently share one status
message.

**Step 2: Introduce a reusable local status pattern**

Use:

- idle
- dirty
- saving
- saved
- blocked
- error

Show status next to the relevant block.

**Step 3: Verify**

Run:

```bash
pnpm test
pnpm build
```

Expected: status messages stay local and routes remain SSR-safe.

**Step 4: Commit**

```bash
git add src/components
git commit -m "refactor: localize mutation status messaging"
```

### Task 10: Re-run the full verification matrix

**Files:**
- Modify tests only if new routes require coverage updates

**Step 1: Run unit and integration tests**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: all pass.

**Step 2: Run smoke coverage**

Run:

```bash
pnpm test:smoke
```

Expected: pass against the new route flow.

**Step 3: Manually verify the key screens**

Check:

- group summary
- members
- parties
- party detail
- new game
- saved game detail
- records
- admin still renders

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify focused UX refactor"
```

## Risks

- `party-workspace.tsx` currently carries business logic and UI in one place
- smoke tests currently assume some existing copy and route behavior
- route split can cause subtle regressions in data loading and protected actions
- localized unlock prompts must not weaken current guard rules

## Notes for Execution

- Prefer moving UI logic first, not changing database contracts
- Keep old helper logic until the new routes are stable, then delete dead code
- Update smoke coverage as each route migrates
- Avoid renaming stable server helpers unless the rename materially reduces confusion
