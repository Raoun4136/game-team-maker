import { notFound } from "next/navigation";

import { NewGameView } from "@/components/new-game-view";
import { listActiveMembers } from "@/lib/queries/groups";
import {
  getPartyById,
  listPartyGames,
  listPartyMembers,
} from "@/lib/queries/parties";

type NewGamePageProps = {
  params: Promise<{
    slug: string;
    partyId: string;
  }>;
};

export default async function NewGamePage({ params }: NewGamePageProps) {
  const { slug, partyId } = await params;
  const party = await getPartyById(slug, partyId);

  if (!party) {
    notFound();
  }

  const [groupMembers, partyMembers, games] = await Promise.all([
    listActiveMembers(slug),
    listPartyMembers(party.id),
    listPartyGames(party.id),
  ]);

  const partyMemberIds = new Set(partyMembers.map((member) => member.memberId));
  const availableMembers = groupMembers.filter((member) => partyMemberIds.has(member.id));
  const latestGame = games[0] ?? null;

  return (
    <NewGameView
      availableMembers={availableMembers}
      party={{
        id: party.id,
        name: party.name,
        status: party.status,
      }}
      slug={slug}
      templateGame={
        latestGame
          ? {
              ...latestGame,
              createdAt: latestGame.createdAt.toISOString(),
              updatedAt: latestGame.updatedAt.toISOString(),
            }
          : null
      }
    />
  );
}
