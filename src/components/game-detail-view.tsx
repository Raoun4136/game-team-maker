"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  GameEditor,
  GameRecord,
  MemberOption,
  TeamPreview,
} from "@/components/game-editor";

type GameDetailViewProps = {
  slug: string;
  party: {
    id: string;
    name: string;
    status: string;
  };
  game: GameRecord;
  availableMembers: MemberOption[];
  initialUnlockExpiresAt: string | null;
};

export function GameDetailView(props: GameDetailViewProps) {
  const router = useRouter();

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              게임
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {props.game.name}
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              파티 <span className="font-medium text-slate-950">{props.party.name}</span> · 생성{" "}
              {new Date(props.game.createdAt).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              href={`/g/${props.slug}/parties/${props.party.id}`}
            >
              파티로 돌아가기
            </Link>
            {props.party.status === "active" ? (
              <Link
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                href={`/g/${props.slug}/parties/${props.party.id}/games/new`}
              >
                새 게임 만들기
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <TeamPreview
            label={props.game.team1Name}
            members={props.game.participants.filter((participant) => participant.assignedTeam === 1)}
            winner={props.game.winnerTeam === 1}
          />
          <TeamPreview
            label={props.game.team2Name}
            members={props.game.participants.filter((participant) => participant.assignedTeam === 2)}
            winner={props.game.winnerTeam === 2}
          />
        </div>
      </section>

      <GameEditor
        availableMembers={props.availableMembers}
        initialUnlockExpiresAt={props.initialUnlockExpiresAt}
        mode="edit"
        onDeleted={() => {
          router.push(`/g/${props.slug}/parties/${props.party.id}`);
          router.refresh();
        }}
        onSaved={() => {
          router.refresh();
        }}
        partyId={props.party.id}
        slug={props.slug}
        templateGame={props.game}
      />
    </div>
  );
}
