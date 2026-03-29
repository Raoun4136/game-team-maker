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
  const [message, setMessage] = useState<string | null>(null);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const partyMembers = useMemo(
    () =>
      props.groupMembers.filter((member) => partyMemberIds.includes(member.id)),
    [partyMemberIds, props.groupMembers],
  );
  const isPartyActive = props.party.status === "active";

  const latestGame = props.initialGames[0] ?? null;

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
              "x-editor-name": editorName,
            },
            body: JSON.stringify({ memberIds: partyMemberIds }),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setMessage(data?.error ?? "파티 참가자 저장에 실패했습니다.");
          return;
        }

        setMessage("파티 참가자 풀이 저장되었습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "파티 참가자 저장에 실패했습니다.");
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
              "x-editor-name": editorName,
            },
            body: JSON.stringify({ status: "ended" }),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setMessage(data?.error ?? "파티 종료에 실패했습니다.");
          return;
        }

        setMessage("파티를 종료했습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "파티 종료에 실패했습니다.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[28px] border border-line bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Party
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {props.party.name}
              </h2>
              <p className="text-sm text-slate-500">
                {props.party.status === "active" ? "진행 중" : "종료됨"} · 시작{" "}
                {new Date(props.party.startedAt).toLocaleString("ko-KR")}
              </p>
            </div>
            {props.party.status === "active" ? (
              <button
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={endParty}
                type="button"
              >
                파티 종료
              </button>
            ) : null}
          </div>

          <form className="mt-6 grid gap-4" onSubmit={syncPartyMembers}>
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold text-slate-950">파티 참가자 풀</h3>
              <p className="text-sm text-slate-500">
                게임 생성에 사용할 멤버를 먼저 고르고 저장합니다.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {props.groupMembers.map((member) => {
                const isChecked = partyMemberIds.includes(member.id);

                return (
                  <label
                    className="flex items-center gap-3 rounded-[20px] border border-line bg-surface px-4 py-3 text-sm text-slate-700"
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
                      <span className="ml-2 text-slate-500">{member.nickname}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              className="h-11 w-fit rounded-2xl border border-line px-4 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              disabled={isPending || !isPartyActive}
              type="submit"
            >
              참가자 풀 저장
            </button>
            {!isPartyActive ? (
              <p className="text-sm text-slate-500">
                종료된 파티는 참가자 풀을 더 이상 수정할 수 없습니다.
              </p>
            ) : null}
          </form>
        </article>

        <article className="rounded-[28px] border border-line bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Party Standings
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
      </section>

      <UnlockPanel slug={props.slug} />

      {message ? (
        <div className="rounded-[20px] border border-line bg-white/80 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      {isPartyActive ? (
        <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              New Game
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              다음 게임 만들기
            </h3>
          </div>
          <div className="mt-6">
            <GameEditor
              availableMembers={partyMembers}
              key={`${props.party.id}-${latestGame?.id ?? "empty"}-${partyMembers.map((m) => m.id).join(":")}`}
              mode="create"
              onSaved={() => {
                setMessage("게임이 저장되었습니다.");
                refresh();
              }}
              partyId={props.party.id}
              slug={props.slug}
              templateGame={latestGame}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            New Game
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            종료된 파티입니다
          </h3>
          <p className="mt-3 text-sm text-slate-500">
            파티를 종료하면 새 게임 생성은 막히고, 기존 게임만 검토하거나 수정할 수 있습니다.
          </p>
        </section>
      )}

      <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Games
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            게임 히스토리
          </h3>
        </div>
        <div className="mt-6 grid gap-4">
          {props.initialGames.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
              아직 생성된 게임이 없습니다.
            </div>
          ) : (
            props.initialGames.map((game) => (
              <article
                className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
                key={game.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <h4 className="text-lg font-semibold text-slate-950">{game.name}</h4>
                    <p className="text-sm text-slate-500">
                      {new Date(game.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <button
                    className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                    onClick={() =>
                      setEditingGameId((current) => (current === game.id ? null : game.id))
                    }
                    type="button"
                  >
                    {editingGameId === game.id ? "편집 닫기" : "편집"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <TeamPreview
                    label={game.team1Name}
                    members={game.participants.filter((participant) => participant.assignedTeam === 1)}
                    winner={game.winnerTeam === 1}
                  />
                  <TeamPreview
                    label={game.team2Name}
                    members={game.participants.filter((participant) => participant.assignedTeam === 2)}
                    winner={game.winnerTeam === 2}
                  />
                </div>

                {editingGameId === game.id ? (
                  <div className="mt-5 border-t border-line pt-5">
                    <GameEditor
                      availableMembers={membersForExistingGame(game)}
                      mode="edit"
                      onDeleted={() => {
                        setMessage("게임을 삭제했습니다.");
                        refresh();
                      }}
                      onSaved={() => {
                        setMessage("게임을 수정했습니다.");
                        refresh();
                      }}
                      partyId={props.party.id}
                      slug={props.slug}
                      templateGame={game}
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
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
  const defaultSelectedMemberIds =
    latestTemplate?.participants
      .map((participant) => participant.memberId)
      .filter((memberId) => availableMemberIds.includes(memberId)) ??
    availableMemberIds;

  const [name, setName] = useState(
    latestTemplate?.name ?? `Game ${new Date().toLocaleTimeString("ko-KR")}`,
  );
  const [team1Name, setTeam1Name] = useState(latestTemplate?.team1Name ?? "Team 1");
  const [team2Name, setTeam2Name] = useState(latestTemplate?.team2Name ?? "Team 2");
  const [selectedMemberIds, setSelectedMemberIds] = useState(defaultSelectedMemberIds);
  const [constraints, setConstraints] = useState(
    toEditableConstraints(latestTemplate?.constraints ?? []),
  );
  const [assignments, setAssignments] = useState<
    Array<{ memberId: string; teamId: 1 | 2 }>
  >(
    latestTemplate
      ? latestTemplate.participants
          .filter((participant) => availableMemberIds.includes(participant.memberId))
          .map((participant) => ({
            memberId: participant.memberId,
            teamId: participant.assignedTeam as 1 | 2,
          }))
      : createBalancedAssignments(defaultSelectedMemberIds),
  );
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | "">(
    latestTemplate?.winnerTeam === 1 || latestTemplate?.winnerTeam === 2
      ? (latestTemplate.winnerTeam as 1 | 2)
      : "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedConstraints = toDraftConstraints(constraints);
  const assignmentValidation =
    selectedMemberIds.length >= 2
      ? validateTeamAssignment(selectedMemberIds, normalizedConstraints, assignments)
      : { ok: false as const, reasons: ["최소 두 명 이상을 선택해 주세요."] };
  const sortedAssignments = sortMembersByTeam(props.availableMembers, assignments);

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
              "x-editor-name": editorName,
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
              "x-editor-name": editorName,
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
      <div className="grid gap-3 md:grid-cols-3">
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

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-950">참가 멤버</h4>
          <p className="text-sm text-slate-500">
            현재 {selectedMemberIds.length}명 선택
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {props.availableMembers.map((member) => (
            <label
              className="flex items-center gap-3 rounded-[20px] border border-line bg-white/70 px-4 py-3 text-sm text-slate-700"
              key={member.id}
            >
              <input
                checked={selectedMemberIds.includes(member.id)}
                onChange={() => toggleSelectedMember(member.id)}
                type="checkbox"
              />
              <span>
                {member.name}
                <span className="ml-2 text-slate-500">{member.nickname}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-lg font-semibold text-slate-950">옵션 / 제약 조건</h4>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => addConstraint("same_team")}
              type="button"
            >
              같은 팀 추가
            </button>
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => addConstraint("different_team")}
              type="button"
            >
              다른 팀 추가
            </button>
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => addConstraint("pinned_team")}
              type="button"
            >
              팀 고정 추가
            </button>
          </div>
        </div>

        {constraints.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-line px-4 py-5 text-sm text-slate-500">
            적용 중인 제약 조건이 없습니다.
          </div>
        ) : (
          constraints.map((constraint) => (
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
          ))
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-950">최종 팀 편성</h4>
            <button
              className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={generateTeams}
              type="button"
            >
              랜덤 생성
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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

        <div className="grid gap-3 rounded-[24px] border border-line bg-white/70 p-4">
          <h4 className="text-lg font-semibold text-slate-950">결과</h4>
          <select
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
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
          <p className="text-sm text-slate-500">
            이미 결과가 있는 게임을 다시 수정하거나 삭제하려면 위에서 비밀번호 잠금 해제를
            먼저 해 주세요.
          </p>
        </div>
      </div>

      {assignmentValidation.ok ? null : (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {assignmentValidation.reasons.join(" ")}
        </div>
      )}

      {message ? (
        <div className="rounded-[20px] border border-line bg-white/80 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

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
          {props.mode === "create" ? "게임 저장" : "게임 수정"}
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
