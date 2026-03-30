# Game Team Maker Focused UX Design

## 1. Scope

This document replaces the previous broad "action hub" redesign with a stricter
single-purpose screen model.

The product rules do not change:

- shared-link group access
- local editor name for attribution
- group password unlock for sensitive operations
- 2-team games only
- random team generation with strict constraints
- standings derived from saved game history

The redesign changes the information architecture, page responsibilities, UI
terminology, and status presentation.

## 2. Problem Summary

The current app contains the right features but the operating flow is still too
dense.

The main issues are:

1. Too many unrelated actions are mixed on one screen
2. User-facing terms are inconsistent
3. Status and protection messages are too far from the action they affect
4. Group-level pages try to operate games instead of just routing to the right
   place

The largest offender is the current party detail experience, where one page
mixes:

- party editing
- party member management
- game creation
- constraint editing
- team generation
- manual team adjustment
- result recording
- past game editing

That structure is workable in code but heavy in use.

## 3. Design Goals

- Keep one primary job per screen
- Normalize terminology everywhere
- Make the live operating flow obvious
- Keep repeated game creation fast without keeping all controls visible at once
- Surface protected actions at the point of action
- Preserve the existing product rules and backend contracts where possible

## 4. Non-Goals

- No account system
- No MMR or skill balancing
- No 3+ team game flow
- No real-time presence or collaboration cursors
- No data-model redesign beyond what the new routes and UI require

## 5. Fixed Product Vocabulary

All user-facing copy should use this vocabulary consistently.

- `그룹`: shared space
- `파티`: one in-house play session
- `게임`: one match inside a party
- `멤버`: person managed inside the group and optionally used in a party
- `팀 편성`: generated or manually adjusted team assignment
- `기록`: standings and change history

These terms should be removed from the UI:

- session
- workspace
- round
- participant pool / 참가자 풀
- history inspector

Internal code can still use old names temporarily during migration, but new UI
copy and new component names should move toward the fixed vocabulary.

## 6. Approach Options

### Option A: Keep the current party detail page and simplify labels

Pros:

- lowest implementation cost
- low routing churn

Cons:

- the main structural overload remains
- naming cleanup alone does not solve decision fatigue

### Option B: Split by screen purpose

Pros:

- each screen has one dominant job
- easier to learn and easier to scan
- aligns with live operator flow
- creates better places for local status and protected actions

Cons:

- more route-level work
- slightly more navigation between tasks

### Option C: Wizard-only game flow

Pros:

- strongest hand-holding
- easy to validate step by step

Cons:

- too rigid for repeat use
- poor fit for quick corrections during live play

## 7. Recommendation

Use **Option B**.

This product is an operator tool. The organizer usually knows what they want to
do, but they need the interface to stay narrow and predictable. Splitting the
experience into focused screens reduces cognitive load without forcing a rigid
wizard.

## 8. Information Architecture

### 8.1 Group-level routes

- `/g/[slug]` Group
- `/g/[slug]/members` Members
- `/g/[slug]/parties` Parties
- `/g/[slug]/logs` Records

### 8.2 Party-level routes

- `/g/[slug]/parties/[partyId]` Party detail
- `/g/[slug]/parties/[partyId]/games/new` New game
- `/g/[slug]/parties/[partyId]/games/[gameId]` Game detail

### 8.3 Navigation model

The group tabs stay, but their meaning changes:

- `그룹`: summary and recent activity only
- `멤버`: member CRUD only
- `파티`: create/select/end parties only
- `기록`: audit history and change records only

The tabs should not behave like interchangeable content zones. Each tab should
communicate a clearly different task area.

## 9. Screen Responsibilities

## 9.1 Group

Purpose: summary and navigation only

Should show:

- group name
- group standings summary
- recent parties
- recent records
- links to active party or latest party

Should not contain:

- party creation form
- member form
- game creation controls

The page answers:

- What group is this?
- What happened recently?
- Where should I go next?

## 9.2 Members

Purpose: member management only

Should show:

- add member form
- active member list
- archived member list

Allowed actions:

- add
- rename
- edit nickname
- archive
- restore

Protected action:

- archive requires group password unlock

This page should not contain party or game controls.

## 9.3 Parties

Purpose: create and choose a party

Should show:

- create party form
- active party card
- ended party history list

Allowed actions:

- create party
- open party
- end party

This page should answer:

- Which party is active now?
- Do I need to create a new party?
- Which ended party do I want to review?

## 9.4 Party Detail

Purpose: view one party and enter game work

Should show:

- party name
- started/ended time
- party status
- party standings
- party member list
- game list
- `새 게임 만들기` CTA

Allowed actions:

- edit party name
- manage party members if party is active
- open any saved game
- move to new-game screen

This screen should not contain the full game builder.

## 9.5 New Game

Purpose: create one new game

Should show six ordered blocks:

1. Basic info
   - game name
   - team names
2. Members
   - start from previous game members by default when available
   - add/remove members from the party
3. Previous setup
   - optionally import previous game options
4. Options
   - same team
   - different team
   - fixed to team 1
   - fixed to team 2
5. Team formation
   - random generate
   - manual move within active options
6. Review and save
   - show what will be saved
   - save action

This screen should not show party history, logs, or broad group summary.

## 9.6 Game Detail

Purpose: manage one saved game

Should show:

- saved game info
- team formation
- applied options
- result status
- protected actions

Allowed actions:

- edit team formation
- edit options
- record result
- modify result
- delete game

Protected actions:

- result modification requires unlock after completion
- delete game requires unlock

## 9.7 Records

Purpose: read audit history

Should show:

- time
- editor name
- target type
- action type
- change summary

Filtering should eventually support:

- date
- actor
- action type

## 10. State and Feedback Rules

### 10.1 Local action states

Each interactive block should own its own status state:

- idle
- dirty
- saving
- saved
- blocked
- error

Do not use one page-level message string for unrelated actions.

### 10.2 Game creation rules

- a new game starts as local draft state
- previous game members are the default when available
- previous game options can be imported explicitly
- option conflicts block team generation
- conflict reasons appear under the options block
- manual team adjustment cannot violate active options

### 10.3 Party rules

- active party: members can be updated and new games can be created
- ended party: party members cannot change and new games cannot be created
- saved games remain viewable in ended parties

## 11. Password Unlock Model

Unlock remains group-scoped and browser-local.

Protected actions:

- archive member
- modify result of a completed game
- delete game

The unlock UI should appear next to the blocked action or inside the action
panel, not as a detached page-top control.

## 12. Records Model

Records remain derived from audit events and saved game data.

Important events that must remain visible:

- member add/edit/archive/restore
- party create/update/end
- game create/update/delete
- result record/update
- team formation changes when saved

## 13. Component Direction

The current `PartyWorkspace` component should be retired. It mixes too many
responsibilities and leaks old naming into the UI.

The target component direction is:

- group summary components
- members page components
- parties page components
- party detail components
- new game form components
- game detail components
- records page components

Temporary adapter components are acceptable during migration, but the destination
should match the route structure.

## 14. Testing Implications

The redesign requires tests at three levels.

### 14.1 Unit

- option conflict validation
- team formation validation
- unlock checks
- status serialization helpers

### 14.2 Integration

- create party
- update party members
- create game
- save team formation
- record result
- protect result modification
- archive and restore member

### 14.3 E2E

- group creation
- member add
- party create
- new game flow
- saved game detail flow
- records visibility

## 15. Success Criteria

The redesign succeeds when:

- group pages feel read-only and navigational rather than overloaded
- party detail no longer contains the full game-builder experience
- game creation and saved-game management are separate screens
- vocabulary is consistent everywhere
- protected actions are explained where they happen
- existing product rules still hold after the UI split
