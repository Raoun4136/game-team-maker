# Game Team Maker UX Redesign Design

## 1. Scope

This document redesigns the current user experience of Game Team Maker without
changing the core product rules:

- shared-link group access
- local editor name for attribution
- group password unlock for sensitive operations
- 2-team games only
- random team generation with strict constraints
- group and party standings derived from game history

The redesign focuses on operator efficiency during live in-house sessions.

## 2. Problem Summary

The current product has the right feature set, but the main operating surface is
too dense.

The largest issue is the party detail page:

- party pool management
- party standings
- sensitive unlock
- new game creation
- constraint editing
- team generation
- manual team adjustment
- result recording
- game history editing

all compete on one screen at once.

This creates four concrete UX failures:

1. Too many decisions are asked in one pass
2. System status is not clear enough per action
3. Sensitive-action unlock is spatially disconnected from the actions it protects
4. The product does not guide the organizer through the natural live-session order

## 3. Design Goals

- Reduce cognitive load during repeated live rounds
- Make the current step obvious at all times
- Make defaults visible and trustworthy
- Separate setup, generation, review, and history management
- Preserve fast expert workflows for repeated games
- Keep destructive or history-changing actions safe without adding heavy friction

## 4. Non-Goals

- No account system
- No skill/MMR balancing
- No 3+ team flow in this redesign
- No real-time collaboration indicators
- No major database model changes

## 5. Approach Options

### Option A: Keep the current page structure and polish interactions

Make the existing pages clearer with better labels, status banners, and smaller
interaction fixes.

Pros:

- lowest implementation cost
- small risk to existing logic

Cons:

- does not solve the main structural overload
- party detail remains too dense
- future additions will make the page worse

### Option B: Task-oriented redesign inside the existing route structure

Keep the current route map, but restructure each page around the real operating
flow. Convert party detail into a task-based workspace with clear sections and
state progression.

Pros:

- fixes the biggest usability issues
- preserves current URLs and backend contracts
- can be implemented incrementally
- scales better as the product grows

Cons:

- requires substantial component refactor
- needs stronger shared UI state patterns

### Option C: Full wizard-driven game flow

Move game creation and editing into a strict multi-step wizard or modal flow.

Pros:

- very clear for novices
- strongest guidance for complex setup

Cons:

- slows expert operators in repeat rounds
- adds navigation overhead for quick edits
- harder to compare current party context while editing a game

## 6. Recommendation

Use **Option B**.

The product is a session operator tool, not a one-time setup form. A full wizard
would over-constrain power users, while small polish on the current layout would
leave the main problem intact. A task-oriented redesign inside the current route
structure gives the best balance of clarity, speed, and incremental delivery.

## 7. Information Architecture

Keep the existing top-level group routes:

- `/g/[slug]` Overview
- `/g/[slug]/parties` Parties
- `/g/[slug]/members` Members
- `/g/[slug]/logs` Logs

Keep the existing party route:

- `/g/[slug]/parties/[partyId]`

Do not add new top-level routes for MVP. Instead, change the content model of
the existing pages.

### 7.1 Navigation model

The group tabs should become stateful navigation, not neutral links.

Each tab should show:

- current location
- optional status badge
- short meaning

Examples:

- Overview
- Parties
- Members
- Logs

Status badges should be light-weight:

- active party count on Parties
- archived member count on Members when non-zero

### 7.2 Overview becomes an action hub

The current overview is mostly a passive summary. It should become a control
panel for “what do I need to do next?”

The new overview should contain:

- current active party card or “no active party”
- quick action to create a party
- quick action to jump to latest active party
- group standings preview
- recent games/logs preview
- attention block for incomplete setup

Example attention states:

- no members yet
- no active party
- active party exists but participant pool is empty
- latest active party has no game yet

The overview should answer:

- What is happening now?
- Where do I continue?
- Is anything blocked?

## 8. Page-Level Redesign

## 8.1 Group Creation

### Current problem

Group creation is simple enough, but the password requirement has high impact and
little framing.

### New design

Keep one-page creation, but clarify intent:

- group name field
- group password field
- brief explanation of what the password protects
- success path statement: “You can share the group link with anyone after creation.”

Add one post-create success handoff state before redirect:

- “Group created”
- slug preview
- “Entering group…”

This is mainly a trust-building improvement.

## 8.2 Editor Name Gate

### Current problem

Editor name capture is always present, but its meaning is weak. It reads like a
settings field rather than a required collaboration identity.

### New design

The editor name area should become a compact identity chip in the group header.

States:

- no name yet: warning style, says edits require a name
- name set: compact chip with edit action
- editing: inline lightweight form

Behavior:

- first write action with no name should open an inline blocker near that action
- the global chip remains editable

This keeps the system lightweight while making attribution requirements obvious.

## 8.3 Members Page

### Current problem

Members page mixes routine actions and sensitive actions, but does not expose the
difference strongly enough. Archived members also disappear without a visible
recovery path.

### New design

Split the page into three blocks:

1. Roster actions
2. Active roster list
3. Archived members drawer

#### Active roster list

Each member row should show:

- name
- nickname
- group standing summary
- last active context if available later
- actions: edit, archive

#### Archived members drawer

Collapsed by default.

Shows:

- archived member rows
- archived date
- restore action

This changes “archive” from seeming destructive to clearly reversible.

#### Sensitive action handling

Do not keep the unlock panel as a standalone top block.
Instead:

- archive click on locked state opens inline unlock prompt
- once unlocked, archive proceeds from the same row

## 8.4 Parties Page

### Current problem

Parties page is usable, but it behaves like a raw list instead of a session
control surface.

### New design

Split into:

1. Active session section
2. Create new party section
3. Past parties history section

#### Active session section

If an active party exists, it gets a dominant card at the top:

- party name
- started time
- participant count
- games count
- quick links:
  - open workspace
  - end party

#### Create new party section

Only secondary when an active party already exists.
If no active party exists, creation becomes primary.

#### Past parties history section

List ended parties with:

- name
- date/time range
- games count
- quick link to open

This page should answer “What session am I operating right now?” before “what is
my historical list?”

## 8.5 Party Detail Workspace

This is the core redesign.

### 8.5.1 New workspace model

The party detail page should become a task-oriented workspace with four stacked
zones:

1. Session Header
2. Setup
3. Current Round Builder
4. Round History

### 8.5.2 Session Header

Show:

- party name
- active/ended status
- start time and optional end time
- member pool count
- game count
- party standings shortcut
- end party action if active

Add a compact session progress strip:

- Pool ready
- Round ready
- Result recorded

This is not literal workflow enforcement. It is guidance.

### 8.5.3 Setup Zone

This zone manages pre-round state.

Subsections:

#### A. Participant Pool

Show selected count and unsaved-changes state.

Required behaviors:

- “Select all active members”
- “Clear”
- search/filter if the roster grows
- explicit unsaved state before sync
- primary action: save pool

Important:

Changing checkboxes should not feel like the pool is already saved. The UI must
show:

- saved state
- dirty state
- saving
- save success

#### B. Party Standings

Keep visible but compact.
This should be a secondary side card, not equal visual weight with round-building.

#### C. Sensitive unlock status

Do not present unlock as a permanent top-level form.
Instead, show a compact status row:

- locked
- unlocked until HH:MM
- unlock button

Sensitive actions can still trigger inline unlock prompts.

### 8.5.4 Current Round Builder

This should replace the giant free-form editor with a clearer sequence.

The builder should have four substeps shown in one page:

1. Base Setup
2. Constraints
3. Team Generation and Manual Review
4. Result and Save

This is not a multi-page wizard. It is a structured single-page builder.

#### Step 1: Base Setup

Fields:

- game name
- team 1 name
- team 2 name
- participants

Defaults:

- if a previous game exists, explicitly show “Started from previous game”
- provide one-click actions:
  - use previous game template
  - use current pool only
  - reset to balanced blank

The origin of defaults must be visible.

#### Step 2: Constraints

Current issue:

Constraint rows are low-context and technical.

New structure:

- constraint summary header
- grouped add buttons:
  - keep together
  - separate
  - pin to team

Each row should read like a sentence:

- `A` and `B` must stay together
- `A` and `B` must be split
- `A` must be on `Blue`

This reduces translation effort from UI controls to mental model.

Add a conflict status block:

- no conflicts
- conflicts found
- list of blocking constraints

This block should sit immediately under constraints, not at the bottom of the
whole editor.

#### Step 3: Team Generation and Manual Review

Current issue:

- “랜덤 생성” is present, but the builder does not clearly distinguish
  generated state from manually adjusted state.

New model:

- state label: `Not generated`, `Generated`, `Adjusted manually`
- action row:
  - generate teams
  - reroll
  - reset manual changes

Manual team edits should be treated as review actions, not as hidden mutation.

Team columns should show:

- team name
- member count
- locked-by-constraint hints where relevant
- drag/drop or explicit move control in future

For MVP redesign, keep select-based movement if needed, but the UI should show
that moving a player is a review action that may be blocked by active constraints.

Constraint-related move failure should appear inline on the affected member row,
not only as a generic message.

#### Step 4: Result and Save

Current issue:

- winner selection and save are visually too detached from what is being saved.

New structure:

- review summary card
  - selected participants
  - active constraints count
  - final team counts
  - result state
- save action row

Buttons:

- save draft game layout
- save with result

For MVP, if separate draft status is too heavy at the data layer, keep one save
action but split the UI copy:

- if no winner selected: `게임 저장`
- if winner selected: `팀 확정 및 결과 저장`

This makes the consequence visible.

### 8.5.5 Round History

Current issue:

Round history is technically complete but operationally noisy.

New structure:

- compact game list with status badges:
  - no result
  - completed
- selecting a game opens a focused inspector/editor panel below or to the side

Do not fully expand an editor inside every card by default.

Each history row should show:

- game name
- timestamp
- team names
- winner badge if completed
- quick actions:
  - view/edit
  - delete

The editor panel for a past game should mirror the same structured builder used
for the current round, but with historical context:

- completed game
- locked or unlocked state
- what changed after save

This reduces duplicated interaction models.

## 9. Interaction Model

## 9.1 Status model

Every write surface should expose local status.

Required status types:

- idle
- dirty
- saving
- saved
- blocked
- error

These statuses should be component-local.

Do not reuse one shared `message` string for unrelated actions across the entire
page.

## 9.2 Error model

Errors must be:

- placed next to the affected action
- written in task language
- recovery-oriented

Examples:

- “참가자 풀이 아직 저장되지 않았습니다.”
- “이 제약 조건끼리 충돌해서 팀을 만들 수 없습니다.”
- “이 게임은 이미 결과가 기록되어 있어 비밀번호 잠금 해제가 필요합니다.”

Avoid global generic failures unless the whole page is blocked.

## 9.3 Sensitive action model

Sensitive actions should use three states:

- locked
- unlocking
- unlocked

Unlock should be group-scoped and session-timed, as today, but surfaced in the
UI more transparently.

When a user hits a sensitive action while locked:

1. keep them in context
2. explain why it is protected
3. allow immediate unlock
4. return them to the action they intended

## 9.4 Save and refresh model

The current product relies on route refresh after writes. That is acceptable, but
the UI should protect continuity better.

Required UX rules:

- do not collapse the entire context after a save if avoidable
- preserve the currently opened game editor after save when editing
- preserve scroll position around the active workspace
- distinguish between `saved remotely` and `still editing`

## 10. Admin UX Redesign

Admin should stay read-mostly, but become more operational.

### 10.1 Admin dashboard structure

Keep three blocks:

- platform summary
- group monitor
- recent activity

Improve with:

- stronger “attention needed” grouping
- filters for event type and actor
- time filter presets
- direct jump to active parties first

### 10.2 Group operations

Add future-safe action placeholders in the design:

- reset group password
- expire unlock sessions
- restore archived members

These can be phased in later, but the information architecture should leave room
for them now.

## 11. Accessibility Design Requirements

- visible active tab and keyboard focus for all navigation and controls
- all async success/error messages exposed as status regions
- validation errors tied to the affected fields
- destructive and protected actions clearly labeled
- no reliance on color alone for completion, locked state, or winner state
- sentence-case status text preferred over all-caps utility tags for readability

## 12. Copy and Terminology Rules

Use consistent product language:

- Group = shared space
- Party = session
- Game = round
- Participant pool = party-level candidate members
- Constraints = round rules
- Sensitive actions = password-protected history-changing actions

Avoid mixing internal and user-facing terms.

Examples of preferred user-facing labels:

- `파티 참가자 풀`
- `이번 게임`
- `이전 게임에서 불러옴`
- `제약 조건 충돌`
- `민감한 수정 잠금 해제`

## 13. Component Architecture Direction

The redesign should split the current party workspace into focused units.

Recommended component groups:

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

This is primarily a UX architecture decision. It reduces state collision and
lets each interaction expose its own status.

## 14. Rollout Plan

### Phase 1: Structural clarity without backend changes

- active tab state
- overview action hub
- parties page split into active/history sections
- local status banners per action
- compact unlock status UI

### Phase 2: Party workspace redesign

- task-oriented layout
- structured round builder
- history list + focused inspector
- local dirty/saved/blocked states

### Phase 3: Member and admin usability improvements

- archived members drawer with restore
- richer admin filtering
- operational safeguards and management actions

## 15. Success Criteria

The redesign is successful if:

- organizers can identify the active session and next step without reading the
  whole page
- new game creation feels like continuing a round, not filling a large form
- constraint conflicts and protected actions are understood before failure
- result recording and save consequences are visible at the moment of action
- history editing is possible without overwhelming the default operating surface

## 16. Immediate Recommendation

The first implementation target should be the party detail page.

If only one major surface is redesigned, redesign:

- `/g/[slug]/parties/[partyId]`

before touching secondary pages.

That route currently holds the highest operator cost and will return the largest
usability gain.
