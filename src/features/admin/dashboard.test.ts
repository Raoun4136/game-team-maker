import { describe, expect, it } from "vitest";

import {
  filterAdminEvents,
  filterAdminGroups,
  filterAdminParties,
  sortAdminGroups,
} from "./dashboard";

const groups = [
  {
    id: "group-a",
    name: "Friday Arena",
    slug: "friday-arena",
    activeMembers: 8,
    archivedMembers: 1,
    parties: 4,
    activeParties: 1,
    games: 12,
    createdAt: "2026-03-29T03:00:00.000Z",
    lastEventAt: "2026-03-29T04:00:00.000Z",
  },
  {
    id: "group-b",
    name: "Sunday League",
    slug: "sunday-league",
    activeMembers: 6,
    archivedMembers: 0,
    parties: 2,
    activeParties: 0,
    games: 4,
    createdAt: "2026-03-27T03:00:00.000Z",
    lastEventAt: "2026-03-28T04:00:00.000Z",
  },
  {
    id: "group-c",
    name: "Newcomer Room",
    slug: "newcomer-room",
    activeMembers: 0,
    archivedMembers: 0,
    parties: 0,
    activeParties: 0,
    games: 0,
    createdAt: "2026-03-25T03:00:00.000Z",
    lastEventAt: null,
  },
];

const events = [
  {
    id: "event-a",
    actorName: "SeongOh",
    eventType: "game.deleted",
    changeSummary: "Deleted game Friday Finals.",
    createdAt: "2026-03-29T04:00:00.000Z",
    groupName: "Friday Arena",
    groupSlug: "friday-arena",
  },
  {
    id: "event-b",
    actorName: "Jin",
    eventType: "member.archived",
    changeSummary: "Archived member Alex.",
    createdAt: "2026-03-28T04:00:00.000Z",
    groupName: "Sunday League",
    groupSlug: "sunday-league",
  },
];

const parties = [
  {
    id: "party-a",
    name: "Friday Finals",
    status: "active",
    startedAt: "2026-03-29T05:00:00.000Z",
    endedAt: null,
    groupName: "Friday Arena",
    groupSlug: "friday-arena",
  },
  {
    id: "party-b",
    name: "Sunday Cup",
    status: "ended",
    startedAt: "2026-03-28T05:00:00.000Z",
    endedAt: "2026-03-28T08:00:00.000Z",
    groupName: "Sunday League",
    groupSlug: "sunday-league",
  },
];

describe("filterAdminGroups", () => {
  it("filters groups by search query", () => {
    expect(filterAdminGroups(groups, { query: "friday", status: "all" })).toEqual([
      groups[0],
    ]);
  });

  it("filters groups that need attention", () => {
    expect(
      filterAdminGroups(groups, { query: "", status: "attention" }).map(
        (group) => group.id,
      ),
    ).toEqual(["group-b", "group-c"]);
  });

  it("filters only active party groups", () => {
    expect(
      filterAdminGroups(groups, { query: "", status: "active-parties" }).map(
        (group) => group.id,
      ),
    ).toEqual(["group-a"]);
  });
});

describe("sortAdminGroups", () => {
  it("sorts groups by recent activity", () => {
    expect(sortAdminGroups(groups, "recent").map((group) => group.id)).toEqual([
      "group-a",
      "group-b",
      "group-c",
    ]);
  });

  it("sorts groups by size", () => {
    expect(sortAdminGroups(groups, "size").map((group) => group.id)).toEqual([
      "group-a",
      "group-b",
      "group-c",
    ]);
  });
});

describe("filterAdminEvents", () => {
  it("filters events by keyword across actor and summary", () => {
    expect(filterAdminEvents(events, "alex")).toEqual([events[1]]);
  });

  it("returns all events for an empty query", () => {
    expect(filterAdminEvents(events, "")).toEqual(events);
  });
});

describe("filterAdminParties", () => {
  it("filters by query and status", () => {
    expect(
      filterAdminParties(parties, { query: "friday", status: "active" }),
    ).toEqual([parties[0]]);
  });
});
