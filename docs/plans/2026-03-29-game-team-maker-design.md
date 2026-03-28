# Game Team Maker Design

## 1. Product Summary

Game Team Maker is a lightweight web app for running Discord in-house matches.
It is optimized for repeated team creation inside a shared group where participants
change often, game sessions span arbitrary time windows, and the organizer needs
fast random team generation with explicit constraints.

The product does not attempt skill-based balancing. Team generation is random by
default, then filtered and validated by user-defined constraints.

## 2. Problem Statement

Running repeated in-house games manually is operationally annoying:

- participants change every session
- the organizer often wants specific people together or separated
- some players must be pinned to a specific team for a given game
- the same session contains multiple games
- results need to be recorded both for the current session and across all history

Existing ad hoc methods such as ladder randomizers or chat coordination do not
preserve history, do not support reusable constraints, and create extra work for
the organizer every round.

## 3. Goals

- Create teams quickly for each game in a session
- Support explicit constraints without adding heavy setup
- Preserve game-by-game history as the source of truth
- Show both group-wide and per-party cumulative records
- Keep access friction low through shared links instead of accounts

## 4. Non-Goals

- No account-based login or role system in MVP
- No Discord OAuth or bot integration in MVP
- No MMR, Elo, or win-rate-based balancing in MVP
- No 3+ team support in MVP
- No live collaborative conflict resolution in MVP

## 5. Primary Users

### Organizer

The organizer creates parties, creates games, adjusts teams, records results, and
uses past game setup as a starting point for the next round.

### Participant

A participant mainly views games, teams, and records, but can also modify data
because MVP uses a shared edit model.

## 6. Core Product Rules

- Access is based on a shared group link
- Anyone with the link can view and edit
- Editor identity is collected through a local name stored in localStorage
- Editor identity is for attribution only, not authentication
- Each group may define a password for sensitive operations
- Sensitive operations require a temporary browser unlock after password check
- Team generation is random first
- Constraints are enforced strictly
- Invalid or conflicting constraint sets block team generation
- A party is a session, not a calendar day
- A party can span midnight without splitting
- A game is always exactly two teams in MVP
- A game result is always one winning team and one losing team
- A game can be edited or deleted after creation
- Members should be archived instead of hard-deleted in MVP
- Major create/update/delete actions should be visible in a group audit log

## 7. User Flow

1. Open a group link
2. If no local editor name exists, enter one
3. Manage the group member roster
4. Create a party
5. Select candidate members for that party
6. Create a game inside the party
7. Start from the previous game's participants by default
8. Optionally import the previous game's option set
9. Edit game name and team names
10. Add or remove participants for the current game
11. Add constraints
12. Generate random teams
13. If valid, review and manually adjust teams
14. Confirm the final team layout
15. Record the winning team
16. View updated party and group cumulative records
17. Repeat for the next game

## 8. Functional Requirements

### Group

- Create a group with a shareable identifier or URL
- Allow group creation with an optional password for sensitive operations
- Show group metadata and member list
- Show group-wide cumulative records derived from all historical games
- Show a group-level audit log page

### Members

- Create, edit, and archive members
- Each member has:
  - name
  - nickname
- archived status
- Member records are reused across multiple parties
- Archiving a member must preserve past game history

### Party

- Create a party manually
- Mark a party as active or ended
- Maintain a selectable party participant pool
- Show party-specific cumulative records derived from games in that party

### Game

- Create multiple games within a party
- Each game stores:
  - game name
  - team 1 name
  - team 2 name
  - selected participants
  - constraints
  - generated/finalized team assignment
  - result
- New games default to the previous game's participant list
- Users can optionally import the previous game's constraints/options
- Team names are editable for every game

### Constraints

The MVP supports:

- member A with member B
- member A separated from member B
- member A pinned to team 1
- member A pinned to team 2

Rules:

- constraints are strict
- conflicting constraints block generation
- manual team edits cannot violate active constraints
- if a user wants a conflicting layout, they must first edit or remove constraints

### Results and History

- Record one winner per game
- Allow later result edits
- Allow full game deletion
- Group cumulative records must update based on game history
- Party cumulative records must update based on game history in that party

### Sensitive Operations

The MVP protects a small set of destructive or history-changing actions with the
group password:

- editing the result of a completed game
- deleting a game
- archiving a member

The password flow should behave as follows:

- a user enters the group password when attempting a sensitive action
- if valid, the browser is temporarily unlocked for a fixed session window
- during the unlocked window, repeated sensitive actions do not require
  re-entering the password
- after the unlock window expires, the password is required again

### Audit Log

Each group should expose a log page that shows important historical changes.

The MVP log should capture at least:

- timestamp
- actor name from localStorage
- target type
- action type
- human-readable change summary

Examples:

- member created
- member updated
- member archived
- party created
- party ended
- game created
- team layout changed
- result recorded
- result edited
- game deleted

## 9. UX Principles

### Fast Repeat Flow

The product should optimize for repeated rounds during a live session.
That means "start from the previous game" is the default posture, not a blank form.

### Minimal Data Re-entry

Creating the next game should feel like cloning the previous one and changing only
what is different:

- tweak participants
- tweak team names
- tweak constraints
- reroll teams

The default should be:

- start from the previous game's participants
- allow optional import of the previous game's constraint set

### Strict Validation

When constraints conflict, the app should stop the user before generation and show
which rules conflict. The system should not silently ignore constraints or produce
best-effort invalid teams.

### Transparent Records

Users should be able to inspect:

- full game history
- current party standings
- all-time group standings

## 10. Data Model Principles

The system should be designed around a relational database with normalized game
history as the source of truth.

Do not treat cumulative wins/losses as the primary canonical record.
Instead:

- each game's participants, team assignment, and result are stored explicitly
- cumulative records are derived from that history
- future optimizations may add cached aggregates, but raw game history remains the
  source of truth

This model improves:

- result correction
- game deletion
- per-party queries
- future support for new game formats
- analytics and auditability

## 11. Proposed Relational Model

### groups

- id
- slug or share_token
- name
- password_hash nullable
- created_at
- updated_at

### members

- id
- group_id
- name
- nickname
- archived_at nullable
- created_at
- updated_at

### parties

- id
- group_id
- name
- status
- started_at
- ended_at
- created_by_name
- created_at
- updated_at

### party_members

- id
- party_id
- member_id
- added_by_name
- created_at

### games

- id
- party_id
- name
- team1_name
- team2_name
- winner_team
- created_by_name
- created_at
- updated_at

### game_participants

- id
- game_id
- member_id
- assigned_team
- created_at
- updated_at

### game_constraints

- id
- game_id
- constraint_type
- member_a_id
- member_b_id nullable
- target_team nullable
- created_at
- updated_at

### audit_events (optional but recommended)

- id
- group_id
- party_id nullable
- game_id nullable
- member_id nullable
- actor_name
- event_type
- change_summary
- payload_json
- created_at

## 12. Derived Record Views

### Group cumulative record

Derived from all completed games in the group:

- wins per member
- losses per member
- total games per member

### Party cumulative record

Derived from all completed games in the current party:

- wins per member
- losses per member
- total games per member

If a result changes or a game is deleted, these views change automatically because
they are calculated from the underlying history.

## 13. Validation Rules

- A game cannot be finalized with fewer than two members per side
- A member cannot be assigned to both teams
- Pinned team constraints must match final team assignment
- "with" and "separate" constraints must not contradict each other
- A pinned team constraint must not contradict another pinned team constraint
- Team generation must fail loudly if no valid assignment exists
- Archived members cannot be added to new parties or games
- Sensitive operations must fail unless the browser is currently unlocked for the
  group

## 14. Open Expansion Paths

- 3+ team support with ranked results
- reusable option templates at party or group level
- richer audit history
- read-only vs edit links
- Discord integration

## 15. MVP Recommendation

Build the MVP around:

- shared group links
- member management
- group password protection for sensitive actions
- party creation and participant pools
- repeated game creation from previous game defaults
- strict constraint-based random team generation
- manual team adjustment within constraint limits
- result recording, editing, and deletion
- group audit log views
- member archiving instead of hard delete
- derived party and group cumulative standings

This captures the operational pain point without prematurely adding balancing
systems, authentication, or complex ranking modes.
