import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PartyWorkspace } from "@/components/party-workspace";
import { listActiveMembers } from "@/lib/queries/groups";
import {
  getPartyById,
  listPartyGames,
  listPartyMembers,
} from "@/lib/queries/parties";
import { getPartyStandings } from "@/lib/queries/standings";
import { getSensitiveUnlockExpiresAt } from "@/lib/server/group-auth";

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
  const cookieStore = await cookies();

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
    <PartyWorkspace
      groupMembers={groupMembers}
      initialGames={games.map((game) => ({
        ...game,
        createdAt: game.createdAt.toISOString(),
        updatedAt: game.updatedAt.toISOString(),
      }))}
      initialPartyMemberIds={partyMembers.map((member) => member.memberId)}
      initialUnlockExpiresAt={
        getSensitiveUnlockExpiresAt(slug, cookieStore)?.toISOString() ?? null
      }
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
