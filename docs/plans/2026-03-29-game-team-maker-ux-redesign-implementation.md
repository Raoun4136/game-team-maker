# Game Team Maker UX Redesign Implementation Plan

## Goal

Implement the UX redesign defined in:

- [2026-03-29-game-team-maker-ux-redesign-design.md](/Users/seongoh/Desktop/programming/game-team-maker/docs/plans/2026-03-29-game-team-maker-ux-redesign-design.md)

The implementation should improve operator clarity and flow without changing the
core product rules or destabilizing the existing data model.

## Delivery Strategy

Use incremental delivery by surface, not by raw component count.

Priority order:

1. Group-level navigation and overview clarity
2. Parties page clarity
3. Party detail workspace redesign
4. Members page archive/restore UX
5. Admin usability improvements

## Phase 1: Group Shell and Overview

### Target files

- [src/app/g/[slug]/layout.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/app/g/[slug]/layout.tsx)
- [src/components/nav-tabs.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/components/nav-tabs.tsx)
- [src/app/g/[slug]/page.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/app/g/[slug]/page.tsx)
- new overview components under `src/components/`

### Work

- Add active-state navigation styling to group tabs
- Add lightweight badges for important tab state
- Rebuild overview into an action hub:
  - active party card
  - quick actions
  - attention states
  - standings preview
  - recent activity preview
- Convert editor name gate from a generic form block to a compact identity module

### Verification

- active tab is visually and semantically clear
- keyboard focus remains visible
- overview exposes a clear “what next” action path
- no regression in slug routing or group lookup

## Phase 2: Parties Page

### Target files

- [src/app/g/[slug]/parties/page.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/app/g/[slug]/parties/page.tsx)
- [src/components/parties-manager.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/components/parties-manager.tsx)
- possible new parties page section components

### Work

- Split parties page into:
  - active party section
  - create new party section
  - ended party history section
- Make active party the dominant block
- Surface party metadata that matters operationally:
  - started at
  - status
  - quick link to open
  - quick end action

### Verification

- active party is easy to spot
- no duplicate active-party confusion
- create/end flows still pass current route handlers and tests

## Phase 3: Party Workspace Refactor

This is the main implementation phase.

### Target files

- [src/components/party-workspace.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/components/party-workspace.tsx)
- new components for party workspace decomposition
- keep existing route handlers unless behavior change is truly required

### Component split

Replace the large single file with focused units:

- `PartyHeaderCard`
- `PartyPoolManager`
- `PartyStandingsCard`
- `UnlockStatus`
- `RoundBuilder`
- `RoundBaseSetup`
- `RoundConstraintsEditor`
- `RoundTeamReview`
- `RoundResultPanel`
- `GameHistoryList`
- `GameHistoryInspector`

### Work

- Introduce task-oriented page sections
- Replace shared page-level `message` handling with component-local status state
- Make participant pool explicitly dirty/saved
- Make round defaults explicit:
  - started from previous game
  - reset to current pool
  - reset to blank
- Move constraint conflicts near the constraint section
- Introduce team generation state labels:
  - not generated
  - generated
  - adjusted manually
- Separate current round builder from past-game editing surface
- Replace inline full-card edit sprawl with:
  - history list
  - focused selected-game inspector

### Verification

- new game flow is visually sequential
- users can still:
  - create game
  - edit game
  - record result
  - delete game
- sensitive-action gating still works
- ended-party restrictions still work
- historical game participants still remain editable

## Phase 4: Members UX

### Target files

- [src/app/g/[slug]/members/page.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/app/g/[slug]/members/page.tsx)
- [src/components/members-manager.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/components/members-manager.tsx)
- member routes if restore action is surfaced

### Work

- Split active and archived members visually
- Add archived-members drawer or section
- Surface restore action for archived members
- Move unlock closer to archive action rather than relying on a detached top panel

### Verification

- archive remains protected
- restore works without data loss
- active and archived states are visually distinct

## Phase 5: Admin UX

### Target files

- [src/app/admin/page.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/app/admin/page.tsx)
- [src/components/admin-dashboard.tsx](/Users/seongoh/Desktop/programming/game-team-maker/src/components/admin-dashboard.tsx)
- [src/features/admin/dashboard.ts](/Users/seongoh/Desktop/programming/game-team-maker/src/features/admin/dashboard.ts)

### Work

- Add stronger “needs attention” grouping
- Add event-type and actor filters
- Improve time-based visibility for recent activity
- Prioritize active parties and broken states higher in the layout
- Leave room in UI structure for future admin operations:
  - password reset
  - unlock expiry
  - archived member restore

### Verification

- admin remains SSR-safe
- filters are stable and predictable
- dashboard still works with empty states and mixed date formats

## Shared Refactors

These should be applied when a surface is touched, not as a single massive
rewrite.

### Mutation state pattern

Create a shared client mutation pattern for:

- idle
- dirty
- saving
- saved
- blocked
- error

Use it instead of one-off `message` strings where possible.

### Inline status and error regions

Standardize:

- success banners
- warning blocks
- locked-state prompts
- field-level and section-level validation messages

### Terminology alignment

Audit and normalize user-facing copy:

- party/session
- game/round
- participant pool
- constraints
- unlock/sensitive actions

## Testing Plan

## Unit / component level

- navigation active-state helpers
- round-builder default-state helpers
- constraint summary formatting
- local status-state transitions

## Route / integration level

Keep existing route tests and add any missing coverage for:

- archived member restore
- selected history inspector behavior if route params or query state are used

## Smoke / end-to-end

Expand smoke or browser-level coverage to assert:

- active party prominence
- participant pool dirty/saved behavior
- builder default source visibility
- sensitive action unlock in context
- history inspector editing flow

## Risks

- `party-workspace.tsx` refactor can easily regress business rules because it
  currently mixes UI orchestration and domain state closely.
- preserving historical participant editing behavior is subtle and must remain
  aligned with server validation rules.
- if UI state is restructured without stable keys, route refresh may collapse the
  currently edited round unexpectedly.

## Rollout Recommendation

Do not refactor all pages at once.

Recommended sequence:

1. Overview and nav
2. Parties page
3. Party workspace
4. Members
5. Admin

The party workspace should be implemented only after the supporting patterns for
local status handling and clearer layout sections are established.
