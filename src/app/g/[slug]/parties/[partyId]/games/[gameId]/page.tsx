import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { GameDetailView } from "@/components/game-detail-view";
import { listActiveMembers } from "@/lib/queries/groups";
import {
  getPartyById,
  getPartyGameById,
  listPartyMembers,
} from "@/lib/queries/parties";
import { getSensitiveUnlockExpiresAt } from "@/lib/server/group-auth";

type GameDetailPageProps = {
  params: Promise<{
    slug: string;
    partyId: string;
    gameId: string;
  }>;
};

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const { slug, partyId, gameId } = await params;
  const party = await getPartyById(slug, partyId);

  if (!party) {
    notFound();
  }

  const [groupMembers, partyMembers, game, cookieStore] = await Promise.all([
    listActiveMembers(slug),
    listPartyMembers(party.id),
    getPartyGameById(party.id, gameId),
    cookies(),
  ]);

  if (!game) {
    notFound();
  }

  const partyMemberIds = new Set(partyMembers.map((member) => member.memberId));
  const availableMembers = [
    ...groupMembers.filter((member) => partyMemberIds.has(member.id)),
    ...game.participants
      .filter((participant) => !partyMemberIds.has(participant.memberId))
      .map((participant) => ({
        id: participant.memberId,
        name: participant.memberName,
        nickname: participant.memberNickname,
      })),
  ];

  return (
    <GameDetailView
      availableMembers={availableMembers}
      game={{
        ...game,
        createdAt: game.createdAt.toISOString(),
        updatedAt: game.updatedAt.toISOString(),
      }}
      initialUnlockExpiresAt={
        getSensitiveUnlockExpiresAt(slug, cookieStore)?.toISOString() ?? null
      }
      party={{
        id: party.id,
        name: party.name,
        status: party.status,
      }}
      slug={slug}
    />
  );
}
