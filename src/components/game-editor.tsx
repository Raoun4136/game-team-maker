"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useState, useTransition } from "react";

import { UnlockPanel } from "@/components/unlock-panel";
import {
  DraftConstraint,
  generateValidTeams,
  moveMemberToTeam,
  validateTeamAssignment,
} from "@/features/games/domain/generator";
import { ensureEditorName } from "@/lib/client/editor-name";
import { encodeEditorNameHeader } from "@/lib/editor-name-header";

export type MemberOption = {
  id: string;
  name: string;
  nickname: string;
};

export type GameRecord = {
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

type SaveGameResponse = {
  id: string;
  name: string;
  winnerTeam: number | null;
};

type GameEditorProps = {
  slug: string;
  partyId: string;
  availableMembers: MemberOption[];
  templateGame: GameRecord | null;
  mode: "create" | "edit";
  onSaved: (game: SaveGameResponse) => void;
  onDeleted?: () => void;
  initialUnlockExpiresAt?: string | null;
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

export function StatusNotice(props: {
  children: ReactNode;
  tone: "neutral" | "warning" | "success";
}) {
  const className =
    props.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : props.tone === "success"
        ? "border-mint/40 bg-mint/15 text-slate-800"
        : "border-line bg-surface text-slate-600";

  return (
    <div className={`rounded-[20px] border px-4 py-3 text-sm ${className}`}>
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

export function TeamPreview(props: {
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

export function GameEditor(props: GameEditorProps) {
  const router = useRouter();
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

  const [name, setName] = useState(initialName);
  const [team1Name, setTeam1Name] = useState(latestTemplate?.team1Name ?? "Team 1");
  const [team2Name, setTeam2Name] = useState(latestTemplate?.team2Name ?? "Team 2");
  const [selectedMemberIds, setSelectedMemberIds] = useState(initialSelectedMemberIds);
  const [constraints, setConstraints] = useState(
    toEditableConstraints(latestTemplate?.constraints ?? []),
  );
  const [assignments, setAssignments] = useState<
    Array<{ memberId: string; teamId: 1 | 2 }>
  >(initialAssignments);
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | "">(initialWinnerTeam);
  const [message, setMessage] = useState<string | null>(null);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(
    props.initialUnlockExpiresAt ?? null,
  );
  const [showUnlockPanel, setShowUnlockPanel] = useState(false);
  const [buildState, setBuildState] = useState<
    "seeded" | "generated" | "manual" | "balanced" | "saved"
  >(
    props.mode === "edit" ? "saved" : latestTemplate ? "seeded" : "balanced",
  );
  const [isPending, startTransition] = useTransition();

  const normalizedConstraints = toDraftConstraints(constraints);
  const assignmentValidation =
    selectedMemberIds.length >= 2
      ? validateTeamAssignment(selectedMemberIds, normalizedConstraints, assignments)
      : { ok: false as const, reasons: ["최소 두 명 이상을 선택해 주세요."] };
  const sortedAssignments = sortMembersByTeam(props.availableMembers, assignments);
  const hasCompletedResult = latestTemplate?.winnerTeam === 1 || latestTemplate?.winnerTeam === 2;

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

  function resetToCurrentMembers() {
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
      setMessage("활성 옵션을 먼저 수정하거나 삭제한 뒤 다시 시도해 주세요.");
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
      setMessage(error instanceof Error ? error.message : "팀 편성 생성에 실패했습니다.");
    }
  }

  function handleProtectedResponse(errorMessage: string) {
    setShowUnlockPanel(true);
    setUnlockMessage(errorMessage);
    setMessage(null);
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
          | ({ error?: string } & Partial<SaveGameResponse>)
          | null;

        if (!response.ok) {
          const errorMessage = data?.error ?? "게임 저장에 실패했습니다.";

          if (response.status === 403 && props.mode === "edit") {
            handleProtectedResponse(errorMessage);
            return;
          }

          setMessage(errorMessage);
          return;
        }

        setMessage(null);
        setUnlockMessage(null);
        props.onSaved({
          id: String(data?.id),
          name: String(data?.name ?? name),
          winnerTeam: data?.winnerTeam ?? null,
        });
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
          const errorMessage = data?.error ?? "게임 삭제에 실패했습니다.";

          if (response.status === 403) {
            handleProtectedResponse(errorMessage);
            return;
          }

          setMessage(errorMessage);
          return;
        }

        setMessage(null);
        setUnlockMessage(null);
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
              기본 정보
            </p>
            <h4 className="text-xl font-semibold text-slate-950">게임 기본 정보</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {buildState === "seeded"
                ? "이전 게임 기준"
                : buildState === "generated"
                  ? "랜덤 생성됨"
                  : buildState === "manual"
                    ? "수동 조정됨"
                    : buildState === "saved"
                      ? "저장된 게임"
                      : "기본 배치"}
            </span>
            {latestTemplate ? (
              <button
                className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
                onClick={resetFromTemplate}
                type="button"
              >
                {props.mode === "edit" ? "원본으로 되돌리기" : "이전 게임 다시 불러오기"}
              </button>
            ) : null}
            <button
              className="rounded-2xl border border-line px-3 py-2 text-sm font-medium text-slate-700"
              onClick={resetToCurrentMembers}
              type="button"
            >
              현재 멤버 기준으로 초기화
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {props.mode === "create" && latestTemplate
            ? "이전 게임의 이름, 멤버, 옵션을 기본값으로 불러왔습니다. 이번 게임에 맞게 필요한 부분만 바꾸세요."
            : "게임 이름과 팀 이름을 정하고, 이번 게임에 들어갈 멤버를 고릅니다."}
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
            <h5 className="text-lg font-semibold text-slate-950">멤버</h5>
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
              옵션
            </p>
            <h4 className="text-xl font-semibold text-slate-950">옵션</h4>
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
            적용 중인 옵션이 없습니다.
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
          <div className="mt-4">
            <StatusNotice tone="warning">{assignmentValidation.reasons.join(" ")}</StatusNotice>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_0.82fr]">
        <div className="rounded-[24px] border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                팀 편성
              </p>
              <h4 className="text-xl font-semibold text-slate-950">팀 편성</h4>
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
                기본 배치
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            랜덤 생성 후에는 수동으로 멤버를 옮길 수 있습니다. 활성 옵션을 깨는 이동은 바로 막습니다.
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
              기록
            </p>
            <h4 className="text-xl font-semibold text-slate-950">기록과 저장</h4>
          </div>
          <div className="mt-4 grid gap-3 rounded-[20px] border border-line bg-white p-4">
            <SummaryRow label="멤버 수" value={`${selectedMemberIds.length}명`} />
            <SummaryRow label="옵션 수" value={`${constraints.length}개`} />
            <SummaryRow
              label="기록 상태"
              value={winnerTeam === "" ? "아직 기록 안 함" : `${winnerTeam === 1 ? team1Name : team2Name} 승리`}
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
            저장하면 그룹 전적과 파티 전적이 함께 갱신됩니다.
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
              : "게임 저장 및 결과 기록"
            : winnerTeam === ""
              ? "게임 수정"
              : "게임 수정 및 결과 기록"}
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
        {props.mode === "edit" ? (
          <button
            className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            onClick={() => setShowUnlockPanel((current) => !current)}
            type="button"
          >
            {showUnlockPanel ? "비밀번호 입력 닫기" : "민감한 수정 잠금 해제"}
          </button>
        ) : null}
      </div>

      {props.mode === "edit" ? (
        <div className="grid gap-3 rounded-[24px] border border-line bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <h5 className="text-lg font-semibold text-slate-950">민감한 수정</h5>
              <p className="text-sm text-slate-600">
                완료된 게임 결과 수정과 게임 삭제는 그룹 비밀번호 잠금 해제가 필요합니다.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                unlockExpiresAt ? "bg-mint/30 text-slate-800" : "bg-sun/30 text-slate-800"
              }`}
            >
              {unlockExpiresAt
                ? `${new Date(unlockExpiresAt).toLocaleTimeString("ko-KR")}까지 해제`
                : hasCompletedResult
                  ? "현재 잠김"
                  : "삭제 시 필요"}
            </span>
          </div>

          {unlockMessage ? (
            <StatusNotice tone={unlockExpiresAt ? "success" : "warning"}>
              {unlockMessage}
            </StatusNotice>
          ) : null}

          {showUnlockPanel ? (
            <UnlockPanel
              onUnlocked={(expiresAt) => {
                const formatted = new Date(expiresAt).toLocaleTimeString("ko-KR");
                setUnlockExpiresAt(expiresAt);
                setUnlockMessage(`민감한 수정이 ${formatted}까지 잠금 해제되었습니다.`);
                setShowUnlockPanel(false);
                router.refresh();
              }}
              slug={props.slug}
            />
          ) : null}
        </div>
      ) : null}
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
