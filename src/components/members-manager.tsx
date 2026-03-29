"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { ensureEditorName } from "@/lib/client/editor-name";

type MemberRecord = {
  id: string;
  name: string;
  nickname: string;
};

type MembersManagerProps = {
  slug: string;
  initialMembers: MemberRecord[];
};

export function MembersManager({
  slug,
  initialMembers,
}: MembersManagerProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
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
            "x-editor-name": editorName,
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
        setMessage(null);
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
            "x-editor-name": editorName,
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
          current.map((member) =>
            member.id === memberId ? updatedMember : member,
          ),
        );
        setMessage(null);
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
            "x-editor-name": editorName,
          },
          body: JSON.stringify({ archived: true }),
        });
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setMessage(data?.error ?? "멤버 비활성화에 실패했습니다.");
          return;
        }

        setMembers((current) => current.filter((member) => member.id !== memberId));
        setMessage(null);
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "멤버 비활성화에 실패했습니다.");
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
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>

      <div className="grid gap-3">
        {members.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-line bg-white/70 px-5 py-6 text-sm text-slate-500">
            아직 멤버가 없습니다.
          </div>
        ) : (
          members.map((member) => (
            <EditableMemberCard
              key={member.id}
              member={member}
              onArchive={archiveMember}
              onSave={updateMember}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EditableMemberCard(props: {
  member: MemberRecord;
  onArchive: (memberId: string) => void;
  onSave: (memberId: string, nextName: string, nextNickname: string) => void;
}) {
  const [name, setName] = useState(props.member.name);
  const [nickname, setNickname] = useState(props.member.nickname);

  return (
    <article className="grid gap-3 rounded-[24px] border border-line bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:grid-cols-[1fr_auto] md:items-end">
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
      <div className="flex gap-2">
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
    </article>
  );
}
