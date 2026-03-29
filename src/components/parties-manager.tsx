"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { ensureEditorName } from "@/lib/client/editor-name";
import { encodeEditorNameHeader } from "@/lib/editor-name-header";

type PartySummary = {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

type PartiesManagerProps = {
  slug: string;
  initialParties: PartySummary[];
};

export function PartiesManager({
  slug,
  initialParties,
}: PartiesManagerProps) {
  const router = useRouter();
  const [parties, setParties] = useState(initialParties);
  const [name, setName] = useState("");
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
        const response = await fetch(`/api/groups/${slug}/parties`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({ name }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage =
            data && typeof data === "object" && "error" in data
              ? String(data.error ?? "파티 생성에 실패했습니다.")
              : "파티 생성에 실패했습니다.";
          setMessage(errorMessage);
          return;
        }

        const createdParty = data as PartySummary;
        setParties((current) => [
          {
            ...createdParty,
            startedAt: String(createdParty.startedAt),
            endedAt: createdParty.endedAt ? String(createdParty.endedAt) : null,
            createdAt: String(createdParty.createdAt ?? createdParty.startedAt),
          },
          ...current,
        ]);
        setName("");
        setMessage(null);
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "파티 생성에 실패했습니다.");
      }
    });
  }

  function endParty(partyId: string) {
    startTransition(async () => {
      try {
        const editorName = ensureEditorName();
        const response = await fetch(`/api/groups/${slug}/parties/${partyId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-editor-name": encodeEditorNameHeader(editorName),
          },
          body: JSON.stringify({ status: "ended" }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage =
            data && typeof data === "object" && "error" in data
              ? String(data.error ?? "파티 종료에 실패했습니다.")
              : "파티 종료에 실패했습니다.";
          setMessage(errorMessage);
          return;
        }

        const updatedParty = data as PartySummary;
        setParties((current) =>
          current.map((party) =>
            party.id === partyId
              ? {
                  ...party,
                  status: updatedParty.status,
                  endedAt: updatedParty.endedAt ? String(updatedParty.endedAt) : null,
                }
              : party,
          ),
        );
        setMessage(null);
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "파티 종료에 실패했습니다.");
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
          <h2 className="text-lg font-semibold text-slate-950">파티 만들기</h2>
          <p className="text-sm text-slate-500">
            자정을 넘겨도 하나의 세션으로 유지되는 내전 파티를 생성합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className="h-11 flex-1 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 3/29 밤 내전"
            value={name}
          />
          <button
            className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
            disabled={isPending || !name.trim()}
            type="submit"
          >
            생성
          </button>
        </div>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>

      <div className="grid gap-3">
        {parties.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-line bg-white/70 px-5 py-6 text-sm text-slate-500">
            아직 파티가 없습니다.
          </div>
        ) : (
          parties.map((party) => (
            <article
              className="grid gap-3 rounded-[24px] border border-line bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:grid-cols-[1fr_auto] md:items-center"
              key={party.id}
            >
              <div className="grid gap-1">
                <Link
                  className="text-lg font-semibold text-slate-950 underline-offset-4 hover:underline"
                  href={`/g/${slug}/parties/${party.id}`}
                >
                  {party.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {party.status === "active" ? "진행 중" : "종료됨"} · 시작{" "}
                  {new Date(party.startedAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                  href={`/g/${slug}/parties/${party.id}`}
                >
                  열기
                </Link>
                {party.status === "active" ? (
                  <button
                    className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    onClick={() => endParty(party.id)}
                    type="button"
                  >
                    종료
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
