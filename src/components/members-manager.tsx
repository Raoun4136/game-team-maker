"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { StatusNotice } from "@/components/game-editor";
import { UnlockPanel } from "@/components/unlock-panel";
import { ensureEditorName } from "@/lib/client/editor-name";
import { encodeEditorNameHeader } from "@/lib/editor-name-header";

type MemberRecord = {
  id: string;
  name: string;
  nickname: string;
};

type MembersManagerProps = {
  slug: string;
  initialMembers: MemberRecord[];
  initialArchivedMembers: Array<MemberRecord & { archivedAt: string | null }>;
};

export function MembersManager({
  slug,
  initialMembers,
  initialArchivedMembers,
}: MembersManagerProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [archivedMembers, setArchivedMembers] = useState(initialArchivedMembers);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [lockedMemberId, setLockedMemberId] = useState<string | null>(null);
  const [lockedMemberMessage, setLockedMemberMessage] = useState<string | null>(null);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(`/api/groups/${slug}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({ name, nickname }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage =
            data && typeof data === "object" && "error" in data
              ? String(data.error ?? "멤버를 추가하지 못했습니다.")
              : "멤버를 추가하지 못했습니다.";
          setMessage(errorMessage);
          return;
        }

        const createdMember = data as MemberRecord;
        setMembers((current) => [...current, createdMember]);
        setName("");
        setNickname("");
        setMessage("멤버를 추가했습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "멤버 추가에 실패했습니다.");
      }
    });
  }

  function updateMember(memberId: string, nextName: string, nextNickname: string) {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(`/api/groups/${slug}/members/${memberId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({
            name: nextName,
            nickname: nextNickname,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage =
            data && typeof data === "object" && "error" in data
              ? String(data.error ?? "멤버 수정에 실패했습니다.")
              : "멤버 수정에 실패했습니다.";
          setMessage(errorMessage);
          return;
        }

        const updatedMember = data as MemberRecord;
        setMembers((current) =>
          current.map((member) => (member.id === memberId ? updatedMember : member)),
        );
        setMessage("멤버를 수정했습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "멤버 수정에 실패했습니다.");
      }
    });
  }

  function archiveMember(memberId: string) {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(`/api/groups/${slug}/members/${memberId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({ archived: true }),
        });
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          const errorMessage = data?.error ?? "멤버 비활성화에 실패했습니다.";

          if (response.status === 403) {
            setLockedMemberId(memberId);
            setLockedMemberMessage(errorMessage);
            setMessage(null);
            return;
          }

          setMessage(errorMessage);
          return;
        }

        const updatedMember = data as MemberRecord & { archivedAt: string | null };
        setMembers((current) => current.filter((member) => member.id !== memberId));
        setArchivedMembers((current) => [
          {
            ...updatedMember,
            archivedAt: updatedMember.archivedAt ? String(updatedMember.archivedAt) : null,
          },
          ...current,
        ]);
        setLockedMemberId(null);
        setLockedMemberMessage(null);
        setMessage("멤버를 비활성화했습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "멤버 비활성화에 실패했습니다.");
      }
    });
  }

  function restoreMember(memberId: string) {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(`/api/groups/${slug}/members/${memberId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({ archived: false }),
        });
        const data = (await response.json().catch(() => null)) as
          | (MemberRecord & { archivedAt?: string | null; error?: string })
          | null;

        if (!response.ok) {
          setMessage(data?.error ?? "멤버 복구에 실패했습니다.");
          return;
        }

        const restoredMember = data as MemberRecord;
        setArchivedMembers((current) => current.filter((member) => member.id !== memberId));
        setMembers((current) => [...current, restoredMember]);
        setMessage("멤버를 다시 활성화했습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "멤버 복구에 실패했습니다.");
      }
    });
  }

  return (
    <section className="grid gap-4">
      <form
        className="grid gap-3 rounded-[24px] border border-line bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
        onSubmit={handleCreate}
      >
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold text-slate-950">멤버 추가</h2>
          <p className="text-sm text-slate-500">
            이름과 닉네임을 저장해 두고, 파티와 게임에서 재사용합니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setName(event.target.value)}
            placeholder="이름"
            value={name}
          />
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setNickname(event.target.value)}
            placeholder="닉네임"
            value={nickname}
          />
        </div>
        <button
          className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          disabled={isPending || !name.trim() || !nickname.trim()}
          type="submit"
        >
          {isPending ? "저장 중..." : "멤버 저장"}
        </button>
        {message ? <StatusNotice tone="neutral">{message}</StatusNotice> : null}
      </form>

      <div className="grid gap-3">
        {members.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-line bg-white/70 px-5 py-6 text-sm text-slate-500">
            아직 멤버가 없습니다.
          </div>
        ) : (
          members.map((member) => (
            <EditableMemberCard
              archiveLocked={lockedMemberId === member.id}
              key={member.id}
              lockedMessage={lockedMemberId === member.id ? lockedMemberMessage : null}
              member={member}
              onArchive={archiveMember}
              onSave={updateMember}
              onUnlockResolved={(expiresAt) => {
                const formatted = new Date(expiresAt).toLocaleTimeString("ko-KR");
                setUnlockExpiresAt(expiresAt);
                setLockedMemberId(member.id);
                setLockedMemberMessage(
                  `민감한 수정이 ${formatted}까지 잠금 해제되었습니다. 다시 비활성화를 눌러 주세요.`,
                );
                router.refresh();
              }}
              onUnlockVisibilityChange={(isOpen) => {
                if (!isOpen && lockedMemberId === member.id) {
                  setLockedMemberId(null);
                  setLockedMemberMessage(null);
                }
              }}
              slug={slug}
              unlockExpiresAt={unlockExpiresAt}
            />
          ))
        )}
      </div>

      <details className="rounded-[24px] border border-line bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <summary className="cursor-pointer list-none text-lg font-semibold text-slate-950">
          비활성 멤버 {archivedMembers.length}명
        </summary>
        <p className="mt-2 text-sm text-slate-500">
          과거 기록은 유지한 채 새 게임 멤버 목록에서만 제외된 멤버입니다.
        </p>
        <div className="mt-4 grid gap-3">
          {archivedMembers.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-line bg-surface px-4 py-5 text-sm text-slate-500">
              아직 비활성 멤버가 없습니다.
            </div>
          ) : (
            archivedMembers.map((member) => (
              <article
                className="grid gap-3 rounded-[20px] border border-line bg-surface p-4 md:grid-cols-[1fr_auto] md:items-center"
                key={member.id}
              >
                <div className="grid gap-1">
                  <p className="font-medium text-slate-950">
                    {member.name}
                    <span className="ml-2 text-slate-500">{member.nickname}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    비활성화 {member.archivedAt ? new Date(member.archivedAt).toLocaleString("ko-KR") : "-"}
                  </p>
                </div>
                <button
                  className="h-11 rounded-2xl border border-line px-4 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                  onClick={() => restoreMember(member.id)}
                  type="button"
                >
                  다시 활성화
                </button>
              </article>
            ))
          )}
        </div>
      </details>
    </section>
  );
}

function EditableMemberCard(props: {
  slug: string;
  member: MemberRecord;
  onArchive: (memberId: string) => void;
  onSave: (memberId: string, nextName: string, nextNickname: string) => void;
  archiveLocked: boolean;
  lockedMessage: string | null;
  unlockExpiresAt: string | null;
  onUnlockResolved: (expiresAt: string) => void;
  onUnlockVisibilityChange: (isOpen: boolean) => void;
}) {
  const [name, setName] = useState(props.member.name);
  const [nickname, setNickname] = useState(props.member.nickname);

  return (
    <article className="grid gap-4 rounded-[24px] border border-line bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setNickname(event.target.value)}
            value={nickname}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="h-11 rounded-2xl border border-line px-4 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            onClick={() => props.onSave(props.member.id, name, nickname)}
            type="button"
          >
            저장
          </button>
          <button
            className="h-11 rounded-2xl bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            onClick={() => props.onArchive(props.member.id)}
            type="button"
          >
            비활성화
          </button>
        </div>
      </div>

      {props.archiveLocked ? (
        <div className="grid gap-3 rounded-[20px] border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <h3 className="text-base font-semibold text-slate-950">민감한 수정 잠금</h3>
              <p className="text-sm text-slate-600">
                멤버 비활성화는 그룹 비밀번호 잠금 해제가 필요합니다.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                props.unlockExpiresAt ? "bg-mint/30 text-slate-800" : "bg-sun/30 text-slate-800"
              }`}
            >
              {props.unlockExpiresAt
                ? `${new Date(props.unlockExpiresAt).toLocaleTimeString("ko-KR")}까지 해제`
                : "현재 잠김"}
            </span>
          </div>
          {props.lockedMessage ? (
            <StatusNotice tone={props.unlockExpiresAt ? "success" : "warning"}>
              {props.lockedMessage}
            </StatusNotice>
          ) : null}
          <UnlockPanel
            onUnlocked={props.onUnlockResolved}
            slug={props.slug}
          />
          <button
            className="justify-self-start text-sm text-slate-500 underline-offset-2 hover:underline"
            onClick={() => props.onUnlockVisibilityChange(false)}
            type="button"
          >
            닫기
          </button>
        </div>
      ) : null}
    </article>
  );
}
