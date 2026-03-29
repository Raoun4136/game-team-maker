export type AdminGroupRecord = {
  id: string;
  name: string;
  slug: string;
  activeMembers: number;
  archivedMembers: number;
  parties: number;
  activeParties: number;
  games: number;
  createdAt: string;
  lastEventAt: string | null;
};

export type AdminEventRecord = {
  id: string;
  actorName: string;
  eventType: string;
  changeSummary: string;
  createdAt: string;
  groupName: string;
  groupSlug: string;
};

export type AdminPartyRecord = {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  groupName: string;
  groupSlug: string;
};

export type GroupFilterStatus = "all" | "active-parties" | "attention";
export type GroupSortMode = "recent" | "size" | "games";
export type PartyFilterStatus = "all" | "active" | "ended";

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export function groupNeedsAttention(group: AdminGroupRecord) {
  return (
    group.activeMembers === 0 ||
    (group.parties > 0 && group.activeParties === 0) ||
    group.lastEventAt === null
  );
}

export function filterAdminGroups(
  groups: AdminGroupRecord[],
  options: {
    query: string;
    status: GroupFilterStatus;
  },
) {
  const query = options.query.trim().toLowerCase();

  return groups.filter((group) => {
    if (
      query &&
      !matchesQuery(group.name, query) &&
      !matchesQuery(group.slug, query)
    ) {
      return false;
    }

    if (options.status === "active-parties") {
      return group.activeParties > 0;
    }

    if (options.status === "attention") {
      return groupNeedsAttention(group);
    }

    return true;
  });
}

export function sortAdminGroups(
  groups: AdminGroupRecord[],
  sortMode: GroupSortMode,
) {
  return [...groups].sort((left, right) => {
    if (sortMode === "size") {
      return (
        right.activeMembers - left.activeMembers ||
        right.games - left.games ||
        left.name.localeCompare(right.name)
      );
    }

    if (sortMode === "games") {
      return (
        right.games - left.games ||
        right.activeMembers - left.activeMembers ||
        left.name.localeCompare(right.name)
      );
    }

    const leftTime = left.lastEventAt ? Date.parse(left.lastEventAt) : 0;
    const rightTime = right.lastEventAt ? Date.parse(right.lastEventAt) : 0;

    return rightTime - leftTime || left.name.localeCompare(right.name);
  });
}

export function filterAdminEvents(events: AdminEventRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return events;
  }

  return events.filter((event) =>
    [
      event.actorName,
      event.eventType,
      event.groupName,
      event.changeSummary,
    ].some((value) => matchesQuery(value, normalizedQuery)),
  );
}

export function filterAdminParties(
  parties: AdminPartyRecord[],
  options: {
    query: string;
    status: PartyFilterStatus;
  },
) {
  const normalizedQuery = options.query.trim().toLowerCase();

  return parties.filter((party) => {
    if (
      normalizedQuery &&
      ![party.name, party.groupName, party.groupSlug].some((value) =>
        matchesQuery(value, normalizedQuery),
      )
    ) {
      return false;
    }

    if (options.status === "active") {
      return party.status === "active";
    }

    if (options.status === "ended") {
      return party.status !== "active";
    }

    return true;
  });
}
