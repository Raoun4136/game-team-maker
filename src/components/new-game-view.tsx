"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { GameEditor, GameRecord, MemberOption } from "@/components/game-editor";

type NewGameViewProps = {
  slug: string;
  party: {
    id: string;
    name: string;
    status: string;
  };
  availableMembers: MemberOption[];
  templateGame: GameRecord | null;
};

export function NewGameView(props: NewGameViewProps) {
  const router = useRouter();

  if (props.party.status !== "active") {
    return (
      <section className="grid gap-4 rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          게임
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          종료된 파티에서는 새 게임을 만들 수 없습니다
        </h2>
        <p className="text-sm leading-7 text-slate-600">
          파티가 종료되어 새 게임 생성이 막혀 있습니다. 파티 상세로 돌아가 기록만 확인할 수 있습니다.
        </p>
        <div>
          <Link
            className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            href={`/g/${props.slug}/parties/${props.party.id}`}
          >
            파티로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  if (props.availableMembers.length === 0) {
    return (
      <section className="grid gap-4 rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          게임
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          먼저 파티 멤버를 저장해야 합니다
        </h2>
        <p className="text-sm leading-7 text-slate-600">
          새 게임은 파티에 저장된 멤버 기준으로 시작합니다. 파티 상세에서 멤버를 먼저 골라 주세요.
        </p>
        <div>
          <Link
            className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            href={`/g/${props.slug}/parties/${props.party.id}`}
          >
            파티로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Game
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              새 게임 만들기
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              파티 <span className="font-medium text-slate-950">{props.party.name}</span> 에서 사용할
              이번 게임을 저장합니다.
            </p>
          </div>
          <Link
            className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            href={`/g/${props.slug}/parties/${props.party.id}`}
          >
            파티로 돌아가기
          </Link>
        </div>
      </section>

      <GameEditor
        availableMembers={props.availableMembers}
        mode="create"
        onSaved={(game) => {
          router.push(`/g/${props.slug}/parties/${props.party.id}/games/${game.id}`);
          router.refresh();
        }}
        partyId={props.party.id}
        slug={props.slug}
        templateGame={props.templateGame}
      />
    </div>
  );
}
