"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { GameRecord, MemberOption, StatusNotice } from "@/components/game-editor";
import { ensureEditorName } from "@/lib/client/editor-name";
import { encodeEditorNameHeader } from "@/lib/editor-name-header";

type StandingRow = {
  memberId: string;
  memberName: string;
  memberNickname: string;
  wins: number;
  losses: number;
  games: number;
};

type PartyDetailViewProps = {
  slug: string;
  party: {
    id: string;
    name: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  };
  groupMembers: MemberOption[];
  initialPartyMemberIds: string[];
  initialGames: GameRecord[];
  standings: StandingRow[];
};

export function PartyDetailView(props: PartyDetailViewProps) {
  const router = useRouter();
  const [partyMemberIds, setPartyMemberIds] = useState(props.initialPartyMemberIds);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [partyMessage, setPartyMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPartyActive = props.party.status === "active";
  const partyMembers = useMemo(
    () => props.groupMembers.filter((member) => partyMemberIds.includes(member.id)),
    [partyMemberIds, props.groupMembers],
  );
  const savedMemberKey = [...props.initialPartyMemberIds].sort().join(":");
  const currentMemberKey = [...partyMemberIds].sort().join(":");
  const membersDirty = savedMemberKey !== currentMemberKey;
  const completedGames = props.initialGames.filter((game) => game.winnerTeam !== null).length;

  function refresh() {
    router.refresh();
  }

  function togglePartyMember(memberId: string) {
    if (!isPartyActive) {
      return;
    }

    setPartyMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function syncPartyMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(
          `/api/groups/${props.slug}/parties/${props.party.id}/members`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-editor-name": encodeEditorNameHeader(editorName),
            },
            body: JSON.stringify({ memberIds: partyMemberIds }),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setMemberMessage(data?.error ?? "파티 멤버 저장에 실패했습니다.");
          return;
        }

        setMemberMessage("파티 멤버를 저장했습니다.");
        refresh();
      } catch (error) {
        setMemberMessage(
          error instanceof Error ? error.message : "파티 멤버 저장에 실패했습니다.",
        );
      }
    });
  }

  function endParty() {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(`/api/groups/${props.slug}/parties/${props.party.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({ status: "ended" }),
        });

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setPartyMessage(data?.error ?? "파티 종료에 실패했습니다.");
          return;
        }

        setPartyMessage("파티를 종료했습니다.");
        refresh();
      } catch (error) {
        setPartyMessage(error instanceof Error ? error.message : "파티 종료에 실패했습니다.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              파티
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {props.party.name}
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              시작 {new Date(props.party.startedAt).toLocaleString("ko-KR")}
              {props.party.endedAt
                ? ` · 종료 ${new Date(props.party.endedAt).toLocaleString("ko-KR")}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPartyActive ? (
              <Link
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                href={`/g/${props.slug}/parties/${props.party.id}/games/new`}
              >
                새 게임 만들기
              </Link>
            ) : null}
            {isPartyActive ? (
              <button
                className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                onClick={endParty}
                type="button"
              >
                파티 종료
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="파티 멤버" value={`${partyMembers.length}명`} />
          <MetricCard label="게임 수" value={`${props.initialGames.length}개`} />
          <MetricCard label="결과 기록" value={`${completedGames}개`} />
          <MetricCard label="상태" value={isPartyActive ? "진행 중" : "종료됨"} />
        </div>

        {partyMessage ? (
          <div className="mt-4">
            <StatusNotice tone="neutral">{partyMessage}</StatusNotice>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                멤버
              </p>
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                파티 멤버
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  membersDirty ? "bg-sun/30 text-slate-800" : "bg-mint/30 text-slate-800"
                }`}
              >
                {membersDirty ? "저장되지 않은 변경" : "저장됨"}
              </span>
              <button
                className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                disabled={!isPartyActive}
                onClick={() => setPartyMemberIds(props.groupMembers.map((member) => member.id))}
                type="button"
              >
                전체 선택
              </button>
              <button
                className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                disabled={!isPartyActive}
                onClick={() => setPartyMemberIds([])}
                type="button"
              >
                비우기
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            이 파티에서 사용할 멤버를 고릅니다. 새 게임은 여기서 저장한 멤버 기준으로 시작합니다.
          </p>

          <form className="mt-5 grid gap-4" onSubmit={syncPartyMembers}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {props.groupMembers.map((member) => {
                const isChecked = partyMemberIds.includes(member.id);

                return (
                  <label
                    className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm ${
                      isChecked
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-line bg-surface text-slate-700"
                    }`}
                    key={member.id}
                  >
                    <input
                      checked={isChecked}
                      disabled={!isPartyActive}
                      onChange={() => togglePartyMember(member.id)}
                      type="checkbox"
                    />
                    <span>
                      {member.name}
                      <span className={isChecked ? "ml-2 text-white/70" : "ml-2 text-slate-500"}>
                        {member.nickname}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="h-11 rounded-2xl border border-line px-4 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isPending || !isPartyActive}
                type="submit"
              >
                파티 멤버 저장
              </button>
              <p className="text-sm text-slate-500">현재 {partyMemberIds.length}명 선택</p>
            </div>
          </form>

          {!isPartyActive ? (
            <p className="mt-3 text-sm text-slate-500">
              종료된 파티는 멤버를 더 이상 수정할 수 없습니다.
            </p>
          ) : null}

          {memberMessage ? (
            <div className="mt-4">
              <StatusNotice tone="neutral">{memberMessage}</StatusNotice>
            </div>
          ) : null}
        </article>

        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              전적
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              파티 전적
            </h3>
          </div>
          <div className="mt-4 grid gap-3">
            {props.standings.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-line px-4 py-5 text-sm text-slate-500">
                아직 결과가 기록된 게임이 없습니다.
              </div>
            ) : (
              props.standings.map((row) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center rounded-[20px] border border-line bg-surface px-4 py-3"
                  key={row.memberId}
                >
                  <div>
                    <p className="font-medium text-slate-950">{row.memberName}</p>
                    <p className="text-sm text-slate-500">{row.memberNickname}</p>
                  </div>
                  <p className="font-mono text-sm text-slate-700">
                    {row.wins}W {row.losses}L / {row.games}G
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              게임
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              이 파티의 게임
            </h3>
          </div>
          {isPartyActive ? (
            <Link
              className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              href={`/g/${props.slug}/parties/${props.party.id}/games/new`}
            >
              새 게임 만들기
            </Link>
          ) : null}
        </div>

        {props.initialGames.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
            아직 저장된 게임이 없습니다.
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {props.initialGames.map((game) => (
              <Link
                className="grid gap-3 rounded-[24px] border border-line bg-surface p-5 transition hover:border-slate-900"
                href={`/g/${props.slug}/parties/${props.party.id}/games/${game.id}`}
                key={game.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <h4 className="text-lg font-semibold text-slate-950">{game.name}</h4>
                    <p className="text-sm text-slate-500">
                      {game.team1Name} vs {game.team2Name} · {game.participants.length}명
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      game.winnerTeam === null
                        ? "bg-slate-100 text-slate-600"
                        : "bg-mint/30 text-slate-800"
                    }`}
                  >
                    {game.winnerTeam === null
                      ? "결과 미기록"
                      : `${game.winnerTeam === 1 ? game.team1Name : game.team2Name} 승리`}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  생성 {new Date(game.createdAt).toLocaleString("ko-KR")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <article className="rounded-[22px] border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        {props.value}
      </p>
    </article>
  );
}
