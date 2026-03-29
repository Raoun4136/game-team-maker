"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import {
  DraftConstraint,
  generateValidTeams,
  moveMemberToTeam,
  validateTeamAssignment,
} from "@/features/games/domain/generator";
import { ensureEditorName } from "@/lib/client/editor-name";
import { encodeEditorNameHeader } from "@/lib/editor-name-header";
import { UnlockPanel } from "@/components/unlock-panel";

type MemberOption = {
  id: string;
  name: string;
  nickname: string;
};

type StandingRow = {
  memberId: string;
  memberName: string;
  memberNickname: string;
  wins: number;
  losses: number;
  games: number;
};

type GameRecord = {
  id: string;
  name: string;
  team1Name: string;
  team2Name: string;
  winnerTeam: number | null;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    memberId: string;
    memberName: string;
    memberNickname: string;
    assignedTeam: number;
  }>;
  constraints: DraftConstraint[];
};

type EditableConstraint =
  | {
      clientId: string;
      type: "same_team" | "different_team";
      memberAId: string;
      memberBId: string;
    }
  | {
      clientId: string;
      type: "pinned_team";
      memberAId: string;
      targetTeam: 1 | 2;
    };

type PartyWorkspaceProps = {
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
  initialUnlockExpiresAt: string | null;
  initialGames: GameRecord[];
  standings: StandingRow[];
};

function createConstraintClientId() {
  return crypto.randomUUID();
}

function toEditableConstraints(constraints: DraftConstraint[]): EditableConstraint[] {
  return constraints.map((constraint) => {
    if (constraint.type === "pinned_team") {
      return {
        clientId: createConstraintClientId(),
        type: constraint.type,
        memberAId: constraint.memberAId,
        targetTeam: constraint.targetTeam,
      };
    }

    return {
      clientId: createConstraintClientId(),
      type: constraint.type,
      memberAId: constraint.memberAId,
      memberBId: constraint.memberBId,
    };
  });
}

function toDraftConstraints(constraints: EditableConstraint[]): DraftConstraint[] {
  return constraints.map((constraint) => {
    if (constraint.type === "pinned_team") {
      return {
        type: constraint.type,
        memberAId: constraint.memberAId,
        targetTeam: constraint.targetTeam,
      };
    }

    return {
      type: constraint.type,
      memberAId: constraint.memberAId,
      memberBId: constraint.memberBId,
    };
  });
}

function createBalancedAssignments(memberIds: string[]) {
  const midpoint = Math.ceil(memberIds.length / 2);

  return memberIds.map((memberId, index) => ({
    memberId,
    teamId: (index < midpoint ? 1 : 2) as 1 | 2,
  }));
}

function normalizeAssignments(
  selectedMemberIds: string[],
  currentAssignments: Array<{ memberId: string; teamId: 1 | 2 }>,
) {
  const nextAssignments = currentAssignments.filter((assignment) =>
    selectedMemberIds.includes(assignment.memberId),
  );

  for (const memberId of selectedMemberIds) {
    if (!nextAssignments.some((assignment) => assignment.memberId === memberId)) {
      const team1Count = nextAssignments.filter((assignment) => assignment.teamId === 1).length;
      const team2Count = nextAssignments.length - team1Count;
      nextAssignments.push({
        memberId,
        teamId: team1Count <= team2Count ? 1 : 2,
      });
    }
  }

  return nextAssignments;
}

function sortMembersByTeam(
  members: MemberOption[],
  assignments: Array<{ memberId: string; teamId: 1 | 2 }>,
) {
  const memberLookup = new Map(members.map((member) => [member.id, member]));

  return assignments
    .map((assignment) => ({
      ...assignment,
      member: memberLookup.get(assignment.memberId),
    }))
    .filter((entry) => entry.member)
    .sort((left, right) => {
      if (left.teamId !== right.teamId) {
        return left.teamId - right.teamId;
      }

      return left.member!.name.localeCompare(right.member!.name);
    }) as Array<{
    memberId: string;
    teamId: 1 | 2;
    member: MemberOption;
  }>;
}

export function PartyWorkspace(props: PartyWorkspaceProps) {
  const router = useRouter();
  const [partyMemberIds, setPartyMemberIds] = useState(props.initialPartyMemberIds);
  const [poolMessage, setPoolMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    props.initialGames[0]?.id ?? null,
  );
  const [showUnlockPanel, setShowUnlockPanel] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(
    props.initialUnlockExpiresAt,
  );
  const [isPending, startTransition] = useTransition();

  const partyMembers = useMemo(
    () =>
      props.groupMembers.filter((member) => partyMemberIds.includes(member.id)),
    [partyMemberIds, props.groupMembers],
  );
  const isPartyActive = props.party.status === "active";

  const latestGame = props.initialGames[0] ?? null;
  const selectedGame =
    props.initialGames.find((game) => game.id === selectedGameId) ??
    props.initialGames[0] ??
    null;
  const savedPoolKey = [...props.initialPartyMemberIds].sort().join(":");
  const currentPoolKey = [...partyMemberIds].sort().join(":");
  const poolDirty = savedPoolKey !== currentPoolKey;
  const completedGames = props.initialGames.filter((game) => game.winnerTeam !== null).length;

  function membersForExistingGame(game: GameRecord) {
    const extras = game.participants
      .filter(
        (participant) => !partyMembers.some((member) => member.id === participant.memberId),
      )
      .map((participant) => ({
        id: participant.memberId,
        name: participant.memberName,
        nickname: participant.memberNickname,
      }));

    return [...partyMembers, ...extras];
  }

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
          setPoolMessage(data?.error ?? "파티 참가자 저장에 실패했습니다.");
          return;
        }

        setPoolMessage("파티 참가자 풀이 저장되었습니다.");
        refresh();
      } catch (error) {
        setPoolMessage(
          error instanceof Error ? error.message : "파티 참가자 저장에 실패했습니다.",
        );
      }
    });
  }

  function endParty() {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(
          `/api/groups/${props.slug}/parties/${props.party.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-editor-name": encodeEditorNameHeader(editorName),
            },
            body: JSON.stringify({ status: "ended" }),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setSessionMessage(data?.error ?? "파티 종료에 실패했습니다.");
          return;
        }

        setSessionMessage("파티를 종료했습니다.");
        refresh();
      } catch (error) {
        setSessionMessage(error instanceof Error ? error.message : "파티 종료에 실패했습니다.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Party Workspace
              </p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isPartyActive ? "bg-mint/30 text-slate-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {isPartyActive ? "진행 중" : "종료됨"}
              </span>
            </div>
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
          {isPartyActive ? (
            <button
              className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={endParty}
              type="button"
            >
              파티 종료
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceMetric label="참가자 풀" value={`${partyMembers.length}명`} />
          <WorkspaceMetric label="게임 수" value={`${props.initialGames.length}개`} />
          <WorkspaceMetric label="기록 완료" value={`${completedGames}개`} />
          <WorkspaceMetric
            label="현재 단계"
            value={isPartyActive ? "이번 라운드 준비" : "기록 검토"}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ProgressStep
            active={partyMembers.length > 0}
            description="이번 세션에서 사용할 멤버를 먼저 저장합니다."
            label="1. 참가자 풀 준비"
          />
          <ProgressStep
            active={isPartyActive}
            description="제약 조건을 점검하고 다음 게임 편성을 만듭니다."
            label="2. 현재 라운드 편성"
          />
          <ProgressStep
            active={completedGames > 0}
            description="결과가 기록되면 파티 전적과 히스토리가 업데이트됩니다."
            label="3. 결과 기록"
          />
        </div>

        {sessionMessage ? <StatusNotice tone="neutral">{sessionMessage}</StatusNotice> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Setup
              </p>
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                파티 참가자 풀
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  poolDirty ? "bg-sun/30 text-slate-800" : "bg-mint/30 text-slate-800"
                }`}
              >
                {poolDirty ? "저장되지 않은 변경" : "저장됨"}
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
            게임 생성에 사용할 멤버 후보를 먼저 고릅니다. 체크를 바꾼 뒤에는 반드시 저장해야
            현재 세션의 기본 풀이 갱신됩니다.
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
                참가자 풀 저장
              </button>
              <p className="text-sm text-slate-500">현재 {partyMemberIds.length}명 선택</p>
            </div>
          </form>
          {!isPartyActive ? (
            <p className="mt-3 text-sm text-slate-500">
              종료된 파티는 참가자 풀을 더 이상 수정할 수 없습니다.
            </p>
          ) : null}
          {poolMessage ? <StatusNotice tone="neutral">{poolMessage}</StatusNotice> : null}
        </article>

        <div className="grid gap-4">
          <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Standings
              </p>
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                파티 내 누적 전적
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

          <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Sensitive Actions
                </p>
                <h3 className="text-xl font-semibold text-slate-950">민감한 수정 잠금</h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  unlockExpiresAt ? "bg-mint/30 text-slate-800" : "bg-sun/30 text-slate-800"
                }`}
              >
                {unlockExpiresAt
                  ? `${new Date(unlockExpiresAt).toLocaleTimeString("ko-KR")}까지 해제`
                  : "현재 잠김"}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              완료된 게임 결과 수정, 게임 삭제, 멤버 비활성화는 그룹 비밀번호 잠금 해제가
              필요합니다.
            </p>
            <button
              className="mt-4 rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              onClick={() => setShowUnlockPanel((current) => !current)}
              type="button"
            >
              {showUnlockPanel ? "잠금 해제 패널 닫기" : "잠금 해제하기"}
            </button>
            {showUnlockPanel ? (
              <div className="mt-4">
                <UnlockPanel
                  onUnlocked={(expiresAt) => {
                    setUnlockExpiresAt(expiresAt);
                    setShowUnlockPanel(false);
                    setSessionMessage("민감한 수정 잠금이 해제되었습니다.");
                  }}
                  slug={props.slug}
                />
              </div>
            ) : null}
          </article>
        </div>
      </section>

      {isPartyActive ? (
        <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Current Round
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              다음 게임 만들기
            </h3>
            <p className="text-sm leading-7 text-slate-600">
              이번 라운드는 직전 게임 설정에서 시작할 수 있습니다. 참가 멤버, 제약 조건,
              팀 편성, 결과를 순서대로 확인하고 저장하세요.
            </p>
          </div>
          <div className="mt-6">
            <GameEditor
              availableMembers={partyMembers}
              key={`${props.party.id}-${latestGame?.id ?? "empty"}-${partyMembers.map((member) => member.id).join(":")}`}
              mode="create"
              onSaved={() => {
                setHistoryMessage("새 게임을 저장했습니다.");
                refresh();
              }}
              partyId={props.party.id}
              slug={props.slug}
              templateGame={latestGame}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Current Round
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            종료된 파티입니다
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            새 게임 생성은 막혀 있지만, 아래 히스토리에서 과거 게임을 검토하거나 수정할 수
            있습니다.
          </p>
        </section>
      )}

      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Round History
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              기존 게임 검토와 수정
            </h3>
          </div>
          {historyMessage ? <StatusNotice tone="neutral">{historyMessage}</StatusNotice> : null}
        </div>

        {props.initialGames.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
            아직 생성된 게임이 없습니다.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="grid gap-3">
              {props.initialGames.map((game) => (
                <button
                  className={`grid gap-3 rounded-[24px] border p-4 text-left transition ${
                    selectedGame?.id === game.id
                      ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                      : "border-line bg-surface text-slate-900 hover:border-slate-900"
                  }`}
                  key={game.id}
                  onClick={() => setSelectedGameId(game.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{game.name}</p>
                      <p
                        className={`mt-1 text-xs ${
                          selectedGame?.id === game.id ? "text-white/70" : "text-slate-500"
                        }`}
                      >
                        {new Date(game.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        game.winnerTeam === null
                          ? selectedGame?.id === game.id
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 text-slate-600"
                          : game.winnerTeam === 1
                            ? "bg-mint/30 text-slate-800"
                            : "bg-sun/25 text-slate-800"
                      }`}
                    >
                      {game.winnerTeam === null
                        ? "결과 미기록"
                        : `${game.winnerTeam === 1 ? game.team1Name : game.team2Name} 승리`}
                    </span>
                  </div>
                  <div
                    className={`text-sm ${
                      selectedGame?.id === game.id ? "text-white/80" : "text-slate-600"
                    }`}
                  >
                    {game.team1Name} vs {game.team2Name} · {game.participants.length}명
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {selectedGame ? (
                <>
                  <div className="rounded-[24px] border border-line bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                          Selected Game
                        </p>
                        <h4 className="text-xl font-semibold text-slate-950">
                          {selectedGame.name}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {new Date(selectedGame.updatedAt).toLocaleString("ko-KR")} 기준
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selectedGame.winnerTeam === null
                            ? "bg-slate-100 text-slate-600"
                            : "bg-mint/30 text-slate-800"
                        }`}
                      >
                        {selectedGame.winnerTeam === null ? "결과 미기록" : "완료된 게임"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <TeamPreview
                        label={selectedGame.team1Name}
                        members={selectedGame.participants.filter(
                          (participant) => participant.assignedTeam === 1,
                        )}
                        winner={selectedGame.winnerTeam === 1}
                      />
                      <TeamPreview
                        label={selectedGame.team2Name}
                        members={selectedGame.participants.filter(
                          (participant) => participant.assignedTeam === 2,
                        )}
                        winner={selectedGame.winnerTeam === 2}
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-line bg-white p-5">
                    <GameEditor
                      availableMembers={membersForExistingGame(selectedGame)}
                      mode="edit"
                      onDeleted={() => {
                        setHistoryMessage("게임을 삭제했습니다.");
                        refresh();
                      }}
                      onSaved={() => {
                        setHistoryMessage("게임을 수정했습니다.");
                        refresh();
                      }}
                      partyId={props.party.id}
                      slug={props.slug}
                      templateGame={selectedGame}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function WorkspaceMetric(props: { label: string; value: string }) {
  return (
    <article className="rounded-[22px] border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        {props.value}
      </p>
    </article>
  );
}

function ProgressStep(props: {
  label: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <span
          className={`size-2.5 rounded-full ${props.active ? "bg-mint" : "bg-slate-300"}`}
        />
        <p className="text-sm font-semibold text-slate-950">{props.label}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{props.description}</p>
    </div>
  );
}

function StatusNotice(props: {
  children: React.ReactNode;
  tone: "neutral" | "warning" | "success";
}) {
  const className =
    props.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : props.tone === "success"
        ? "border-mint/40 bg-mint/15 text-slate-800"
        : "border-line bg-surface text-slate-600";

  return (
    <div className={`mt-4 rounded-[20px] border px-4 py-3 text-sm ${className}`}>
      {props.children}
    </div>
  );
}

function SummaryRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <p className="text-sm text-slate-500">{props.label}</p>
      <p className="text-sm font-medium text-slate-900">{props.value}</p>
    </div>
  );
}

function TeamPreview(props: {
  label: string;
  winner: boolean;
  members: Array<{ memberName: string; memberNickname: string }>;
}) {
  return (
    <div className="rounded-[20px] border border-line bg-white/75 p-4">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-slate-950">{props.label}</h5>
        {props.winner ? (
          <span className="rounded-full bg-mint/30 px-3 py-1 text-xs font-medium text-slate-700">
            WIN
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {props.members.map((member) => (
          <div className="text-sm text-slate-600" key={`${member.memberName}-${member.memberNickname}`}>
            {member.memberName} <span className="text-slate-400">{member.memberNickname}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameEditor(props: {
  slug: string;
  partyId: string;
  availableMembers: MemberOption[];
  templateGame: GameRecord | null;
  mode: "create" | "edit";
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const latestTemplate = props.templateGame;
  const availableMemberIds = props.availableMembers.map((member) => member.id);
  const initialSelectedMemberIds =
    latestTemplate?.participants
      .map((participant) => participant.memberId)
      .filter((memberId) => availableMemberIds.includes(memberId)) ??
    availableMemberIds;
  const initialAssignments = latestTemplate
    ? latestTemplate.participants
        .filter((participant) => availableMemberIds.includes(participant.memberId))
        .map((participant) => ({
          memberId: participant.memberId,
          teamId: participant.assignedTeam as 1 | 2,
        }))
    : createBalancedAssignments(initialSelectedMemberIds);
  const initialName =
    props.mode === "edit"
      ? latestTemplate?.name ?? `Game ${new Date().toLocaleTimeString("ko-KR")}`
      : `Game ${new Date().toLocaleTimeString("ko-KR")}`;
  const initialWinnerTeam =
    props.mode === "edit" &&
    (latestTemplate?.winnerTeam === 1 || latestTemplate?.winnerTeam === 2)
      ? (latestTemplate.winnerTeam as 1 | 2)
      : "";
  const defaultSelectedMemberIds =
    props.mode === "edit" ? initialSelectedMemberIds : initialSelectedMemberIds;

  const [name, setName] = useState(initialName);
  const [team1Name, setTeam1Name] = useState(latestTemplate?.team1Name ?? "Team 1");
  const [team2Name, setTeam2Name] = useState(latestTemplate?.team2Name ?? "Team 2");
  const [selectedMemberIds, setSelectedMemberIds] = useState(defaultSelectedMemberIds);
  const [constraints, setConstraints] = useState(
    toEditableConstraints(
      props.mode === "edit" ? latestTemplate?.constraints ?? [] : latestTemplate?.constraints ?? [],
    ),
  );
  const [assignments, setAssignments] = useState<
    Array<{ memberId: string; teamId: 1 | 2 }>
  >(initialAssignments);
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | "">(initialWinnerTeam);
  const [message, setMessage] = useState<string | null>(null);
  const [buildState, setBuildState] = useState<
    "seeded" | "generated" | "manual" | "balanced" | "saved"
  >(
    props.mode === "edit"
      ? "saved"
      : latestTemplate
        ? "seeded"
        : "balanced",
  );
  const [isPending, startTransition] = useTransition();

  const normalizedConstraints = toDraftConstraints(constraints);
  const assignmentValidation =
    selectedMemberIds.length >= 2
      ? validateTeamAssignment(selectedMemberIds, normalizedConstraints, assignments)
      : { ok: false as const, reasons: ["최소 두 명 이상을 선택해 주세요."] };
  const sortedAssignments = sortMembersByTeam(props.availableMembers, assignments);

  function resetFromTemplate() {
    if (!latestTemplate) {
      return;
    }

    const nextSelectedMemberIds = latestTemplate.participants
      .map((participant) => participant.memberId)
      .filter((memberId) => availableMemberIds.includes(memberId));

    setName(props.mode === "edit" ? latestTemplate.name : initialName);
    setTeam1Name(latestTemplate.team1Name);
    setTeam2Name(latestTemplate.team2Name);
    setSelectedMemberIds(nextSelectedMemberIds);
    setConstraints(toEditableConstraints(latestTemplate.constraints));
    setAssignments(
      latestTemplate.participants
        .filter((participant) => availableMemberIds.includes(participant.memberId))
        .map((participant) => ({
          memberId: participant.memberId,
          teamId: participant.assignedTeam as 1 | 2,
        })),
    );
    setWinnerTeam(props.mode === "edit" ? initialWinnerTeam : "");
    setBuildState(props.mode === "edit" ? "saved" : "seeded");
    setMessage(null);
  }

  function resetToCurrentPool() {
    const nextSelectedMemberIds = availableMemberIds;
    setSelectedMemberIds(nextSelectedMemberIds);
    setConstraints([]);
    setAssignments(createBalancedAssignments(nextSelectedMemberIds));
    if (props.mode === "create") {
      setWinnerTeam("");
      setName(initialName);
    }
    setBuildState("balanced");
    setMessage(null);
  }

  function resetBalancedTeams() {
    setAssignments(createBalancedAssignments(selectedMemberIds));
    setBuildState("balanced");
    setMessage(null);
  }

  function changeAssignedTeam(memberId: string, teamId: 1 | 2) {
    const result = moveMemberToTeam(
      selectedMemberIds,
      normalizedConstraints,
      assignments,
      memberId,
      teamId,
    );

    if (!result.ok) {
      setMessage("활성 제약을 먼저 수정하거나 삭제한 뒤 다시 시도해 주세요.");
      return;
    }

    setAssignments(result.assignments);
    setBuildState("manual");
    setMessage(null);
  }

  function toggleSelectedMember(memberId: string) {
    setSelectedMemberIds((current) => {
      const nextSelectedMemberIds = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId];

      setAssignments((currentAssignments) =>
        normalizeAssignments(nextSelectedMemberIds, currentAssignments),
      );

      return nextSelectedMemberIds;
    });
  }

  function addConstraint(type: EditableConstraint["type"]) {
    const fallbackMemberId = selectedMemberIds[0] ?? props.availableMembers[0]?.id ?? "";
    const secondMemberId = selectedMemberIds[1] ?? props.availableMembers[1]?.id ?? fallbackMemberId;

    if (type === "pinned_team") {
      setConstraints((current) => [
        ...current,
        {
          clientId: createConstraintClientId(),
          type,
          memberAId: fallbackMemberId,
          targetTeam: 1,
        },
      ]);
      return;
    }

    setConstraints((current) => [
      ...current,
      {
        clientId: createConstraintClientId(),
        type,
        memberAId: fallbackMemberId,
        memberBId: secondMemberId,
      },
    ]);
  }

  function updateConstraint(clientId: string, nextConstraint: EditableConstraint) {
    setConstraints((current) =>
      current.map((constraint) =>
        constraint.clientId === clientId ? nextConstraint : constraint,
      ),
    );
  }

  function generateTeams() {
    try {
      const result = generateValidTeams(selectedMemberIds, normalizedConstraints);
      setAssignments([
        ...result.team1.map((memberId) => ({ memberId, teamId: 1 as const })),
        ...result.team2.map((memberId) => ({ memberId, teamId: 2 as const })),
      ]);
      setBuildState("generated");
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "팀 생성에 실패했습니다.");
    }
  }

  function saveGame() {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(
          props.mode === "create"
            ? `/api/groups/${props.slug}/parties/${props.partyId}/games`
            : `/api/groups/${props.slug}/parties/${props.partyId}/games/${latestTemplate?.id}`,
          {
            method: props.mode === "create" ? "POST" : "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-editor-name": encodeEditorNameHeader(editorName),
            },
            body: JSON.stringify({
              name,
              team1Name,
              team2Name,
              participantIds: selectedMemberIds,
              constraints: normalizedConstraints,
              assignments,
              winnerTeam: winnerTeam || null,
            }),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setMessage(data?.error ?? "게임 저장에 실패했습니다.");
          return;
        }

        setMessage(null);
        props.onSaved();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "게임 저장에 실패했습니다.");
      }
    });
  }

  function deleteGame() {
    const onDeleted = props.onDeleted;

    if (!latestTemplate?.id || !onDeleted) {
      return;
    }

    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(
          `/api/groups/${props.slug}/parties/${props.partyId}/games/${latestTemplate.id}`,
          {
            method: "DELETE",
            headers: {
              "x-editor-name": encodeEditorNameHeader(editorName),
            },
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setMessage(data?.error ?? "게임 삭제에 실패했습니다.");
          return;
        }

        setMessage(null);
        onDeleted();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "게임 삭제에 실패했습니다.");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[24px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Step 1
            </p>
            <h4 className="text-xl font-semibold text-slate-950">기본 설정</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {buildState === "seeded"
                ? "직전 게임에서 시작"
                : buildState === "generated"
                  ? "랜덤 생성됨"
                  : buildState === "manual"
                    ? "수동 조정됨"
                    : buildState === "saved"
                      ? "기존 게임 불러옴"
                      : "균형 기본 배치"}
            </span>
            {latestTemplate ? (
              <button
                className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
                onClick={resetFromTemplate}
                type="button"
              >
                {props.mode === "edit" ? "원본으로 되돌리기" : "직전 게임 다시 불러오기"}
              </button>
            ) : null}
            {props.mode === "create" ? (
              <button
                className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
                onClick={resetToCurrentPool}
                type="button"
              >
                현재 파티 풀 기준으로 초기화
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {props.mode === "create" && latestTemplate
            ? "직전 게임의 팀 이름, 멤버, 제약 조건을 기본값으로 불러왔습니다. 이번 판에 맞게 필요한 부분만 수정하세요."
            : "게임 이름과 팀 이름을 정하고, 이번 라운드에 참가할 멤버를 선택합니다."}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setName(event.target.value)}
            placeholder="게임 이름"
            value={name}
          />
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setTeam1Name(event.target.value)}
            placeholder="팀 1 이름"
            value={team1Name}
          />
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setTeam2Name(event.target.value)}
            placeholder="팀 2 이름"
            value={team2Name}
          />
        </div>
        <div className="mt-5 grid gap-3">
          <div className="flex items-center justify-between">
            <h5 className="text-lg font-semibold text-slate-950">참가 멤버</h5>
            <p className="text-sm text-slate-500">현재 {selectedMemberIds.length}명 선택</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {props.availableMembers.map((member) => (
              <label
                className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm ${
                  selectedMemberIds.includes(member.id)
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-line bg-white/70 text-slate-700"
                }`}
                key={member.id}
              >
                <input
                  checked={selectedMemberIds.includes(member.id)}
                  onChange={() => toggleSelectedMember(member.id)}
                  type="checkbox"
                />
                <span>
                  {member.name}
                  <span
                    className={
                      selectedMemberIds.includes(member.id)
                        ? "ml-2 text-white/70"
                        : "ml-2 text-slate-500"
                    }
                  >
                    {member.nickname}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Step 2
            </p>
            <h4 className="text-xl font-semibold text-slate-950">제약 조건</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => addConstraint("same_team")}
              type="button"
            >
              같은 팀
            </button>
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => addConstraint("different_team")}
              type="button"
            >
              다른 팀
            </button>
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => addConstraint("pinned_team")}
              type="button"
            >
              팀 고정
            </button>
          </div>
        </div>

        {constraints.length === 0 ? (
          <div className="mt-4 rounded-[20px] border border-dashed border-line px-4 py-5 text-sm text-slate-500">
            적용 중인 제약 조건이 없습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {constraints.map((constraint) => (
              <ConstraintRow
                availableMembers={props.availableMembers.filter((member) =>
                  selectedMemberIds.includes(member.id),
                )}
                constraint={constraint}
                key={constraint.clientId}
                onChange={(nextConstraint) => updateConstraint(constraint.clientId, nextConstraint)}
                onRemove={() =>
                  setConstraints((current) =>
                    current.filter((item) => item.clientId !== constraint.clientId),
                  )
                }
              />
            ))}
          </div>
        )}

        {!assignmentValidation.ok ? (
          <StatusNotice tone="warning">{assignmentValidation.reasons.join(" ")}</StatusNotice>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_0.82fr]">
        <div className="rounded-[24px] border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Step 3
              </p>
              <h4 className="text-xl font-semibold text-slate-950">팀 생성과 검토</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={generateTeams}
                type="button"
              >
                랜덤 생성
              </button>
              <button
                className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
                onClick={resetBalancedTeams}
                type="button"
              >
                균형 기본 배치
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            랜덤 생성 후에는 수동으로 팀을 조정할 수 있습니다. 활성 제약을 깨는 이동은
            즉시 막힙니다.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <TeamAssignmentEditor
              assignments={sortedAssignments.filter((assignment) => assignment.teamId === 1)}
              label={team1Name}
              onTeamChange={changeAssignedTeam}
            />
            <TeamAssignmentEditor
              assignments={sortedAssignments.filter((assignment) => assignment.teamId === 2)}
              label={team2Name}
              onTeamChange={changeAssignedTeam}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-surface p-5">
          <div className="grid gap-1">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Step 4
            </p>
            <h4 className="text-xl font-semibold text-slate-950">결과와 저장</h4>
          </div>
          <div className="mt-4 grid gap-3 rounded-[20px] border border-line bg-white p-4">
            <SummaryRow label="참가 멤버" value={`${selectedMemberIds.length}명`} />
            <SummaryRow label="제약 조건" value={`${constraints.length}개`} />
            <SummaryRow
              label="결과 상태"
              value={winnerTeam === "" ? "미기록" : `${winnerTeam === 1 ? team1Name : team2Name} 승리`}
            />
          </div>
          <select
            className="mt-4 h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) =>
              setWinnerTeam(
                event.target.value === ""
                  ? ""
                  : (Number(event.target.value) as 1 | 2),
              )
            }
            value={winnerTeam}
          >
            <option value="">아직 기록 안 함</option>
            <option value="1">{team1Name} 승리</option>
            <option value="2">{team2Name} 승리</option>
          </select>
          <p className="mt-3 text-sm text-slate-500">
            이미 결과가 있는 게임을 다시 수정하거나 삭제하려면 파티 상단의 민감한 수정 잠금
            해제가 필요합니다.
          </p>
        </div>
      </div>

      {message ? <StatusNotice tone="neutral">{message}</StatusNotice> : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          disabled={
            isPending ||
            !name.trim() ||
            !team1Name.trim() ||
            !team2Name.trim() ||
            !assignmentValidation.ok
          }
          onClick={saveGame}
          type="button"
        >
          {props.mode === "create"
            ? winnerTeam === ""
              ? "게임 저장"
              : "팀 확정 및 결과 저장"
            : winnerTeam === ""
              ? "게임 수정"
              : "게임 수정 및 결과 저장"}
        </button>
        {props.mode === "edit" && props.onDeleted ? (
          <button
            className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            onClick={deleteGame}
            type="button"
          >
            게임 삭제
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TeamAssignmentEditor(props: {
  label: string;
  assignments: Array<{
    memberId: string;
    member: MemberOption;
    teamId: 1 | 2;
  }>;
  onTeamChange: (memberId: string, teamId: 1 | 2) => void;
}) {
  return (
    <div className="rounded-[20px] border border-line bg-white/70 p-4">
      <h5 className="font-semibold text-slate-950">{props.label}</h5>
      <div className="mt-3 grid gap-2">
        {props.assignments.map((assignment) => (
          <div
            className="flex items-center justify-between gap-2 rounded-2xl border border-line px-3 py-2"
            key={assignment.memberId}
          >
            <div className="text-sm text-slate-700">
              {assignment.member.name}
              <span className="ml-2 text-slate-500">{assignment.member.nickname}</span>
            </div>
            <select
              className="rounded-xl border border-line bg-white px-2 py-1 text-sm outline-none focus:border-slate-900"
              onChange={(event) =>
                props.onTeamChange(
                  assignment.memberId,
                  Number(event.target.value) as 1 | 2,
                )
              }
              value={assignment.teamId}
            >
              <option value="1">팀 1</option>
              <option value="2">팀 2</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConstraintRow(props: {
  constraint: EditableConstraint;
  availableMembers: MemberOption[];
  onChange: (constraint: EditableConstraint) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-[20px] border border-line bg-white/70 p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center">
      <select
        className="h-10 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
        onChange={(event) => {
          const nextType = event.target.value as EditableConstraint["type"];
          const firstMemberId = props.availableMembers[0]?.id ?? "";
          const secondMemberId = props.availableMembers[1]?.id ?? firstMemberId;

          if (nextType === "pinned_team") {
            props.onChange({
              clientId: props.constraint.clientId,
              type: nextType,
              memberAId: firstMemberId,
              targetTeam: 1,
            });
            return;
          }

          props.onChange({
            clientId: props.constraint.clientId,
            type: nextType,
            memberAId: firstMemberId,
            memberBId: secondMemberId,
          });
        }}
        value={props.constraint.type}
      >
        <option value="same_team">같은 팀</option>
        <option value="different_team">다른 팀</option>
        <option value="pinned_team">팀 고정</option>
      </select>

      <select
        className="h-10 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
        onChange={(event) => {
          if (props.constraint.type === "pinned_team") {
            props.onChange({ ...props.constraint, memberAId: event.target.value });
            return;
          }

          props.onChange({ ...props.constraint, memberAId: event.target.value });
        }}
        value={props.constraint.memberAId}
      >
        {props.availableMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      {props.constraint.type === "pinned_team" ? (
        <select
          className="h-10 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
          onChange={(event) => {
            if (props.constraint.type !== "pinned_team") {
              return;
            }

            props.onChange({
              ...props.constraint,
              targetTeam: Number(event.target.value) as 1 | 2,
            });
          }}
          value={props.constraint.targetTeam}
        >
          <option value="1">팀 1</option>
          <option value="2">팀 2</option>
        </select>
      ) : (
        <select
          className="h-10 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
          onChange={(event) => {
            if (props.constraint.type === "pinned_team") {
              return;
            }

            props.onChange({
              ...props.constraint,
              memberBId: event.target.value,
            });
          }}
          value={props.constraint.memberBId}
        >
          {props.availableMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      )}

      <button
        className="h-10 rounded-2xl bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
        onClick={props.onRemove}
        type="button"
      >
        제거
      </button>
    </div>
  );
}
