import { notFound } from "next/navigation";

import { PartyDetailView } from "@/components/party-detail-view";
import { listActiveMembers } from "@/lib/queries/groups";
import {
  getPartyById,
  listPartyGames,
  listPartyMembers,
} from "@/lib/queries/parties";
import { getPartyStandings } from "@/lib/queries/standings";

type PartyDetailPageProps = {
  params: Promise<{
    slug: string;
    partyId: string;
  }>;
};

export default async function PartyDetailPage({
  params,
}: PartyDetailPageProps) {
  const { slug, partyId } = await params;
  const party = await getPartyById(slug, partyId);

  if (!party) {
    notFound();
  }

  const [groupMembers, partyMembers, games, standings] = await Promise.all([
    listActiveMembers(slug),
    listPartyMembers(party.id),
    listPartyGames(party.id),
    getPartyStandings(party.id),
  ]);

  return (
    <PartyDetailView
      groupMembers={groupMembers}
      initialGames={games.map((game) => ({
        ...game,
        createdAt: game.createdAt.toISOString(),
        updatedAt: game.updatedAt.toISOString(),
      }))}
      initialPartyMemberIds={partyMembers.map((member) => member.memberId)}
      party={{
        id: party.id,
        name: party.name,
        status: party.status,
        startedAt: party.startedAt.toISOString(),
        endedAt: party.endedAt ? party.endedAt.toISOString() : null,
      }}
      standings={standings}
      slug={slug}
    />
  );
}
