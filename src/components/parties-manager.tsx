"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

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

  const activeParties = useMemo(
    () => parties.filter((party) => party.status === "active"),
    [parties],
  );
  const endedParties = useMemo(
    () => parties.filter((party) => party.status !== "active"),
    [parties],
  );
  const latestParty = parties[0] ?? null;

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
        setMessage("새 파티를 만들었습니다.");
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
        setMessage("파티를 종료했습니다.");
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "파티 종료에 실패했습니다.");
      }
    });
  }

  return (
    <section className="grid gap-6">
      <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              파티
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              지금 운영 중인 파티
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              진행 중인 파티를 먼저 열고, 없으면 새 파티를 만들어 운영을 시작합니다.
            </p>
          </div>
          {latestParty ? (
            <Link
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              href={`/g/${slug}/parties/${latestParty.id}`}
            >
              최근 파티 바로 열기
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4">
          {activeParties.length === 0 ? (
            <article className="rounded-[28px] border border-dashed border-line bg-surface px-5 py-6 text-sm text-slate-500">
              현재 진행 중인 파티가 없습니다. 아래에서 새 파티를 만들면 바로 파티 화면으로 들어갈 수 있습니다.
            </article>
          ) : (
            activeParties.map((party) => (
              <PartyCard
                key={party.id}
                mode="active"
                onEnd={endParty}
                party={party}
                slug={slug}
              />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          className="grid gap-4 rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
          onSubmit={handleCreate}
        >
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              새 파티
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              새 파티 만들기
            </h3>
            <p className="text-sm leading-7 text-slate-600">
              새 파티를 열면 그 안에서 멤버와 게임 기록을 관리합니다.
            </p>
          </div>
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 금요일 밤 내전"
            value={name}
          />
          <button
            className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
            disabled={isPending || !name.trim()}
            type="submit"
          >
            {isPending ? "생성 중..." : "파티 생성"}
          </button>
          {message ? (
            <p className="rounded-[20px] border border-line bg-surface px-4 py-3 text-sm text-slate-600">
              {message}
            </p>
          ) : null}
        </form>

        <section className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              지난 파티
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              종료된 파티
            </h3>
          </div>
          <div className="mt-5 grid gap-3">
            {endedParties.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-line bg-surface px-5 py-6 text-sm text-slate-500">
                아직 종료된 파티가 없습니다.
              </div>
            ) : (
              endedParties.map((party) => (
                <PartyCard key={party.id} mode="history" party={party} slug={slug} />
              ))
            )}
          </div>
        </section>
      </section>
    </section>
  );
}

function PartyCard(props: {
  slug: string;
  party: PartySummary;
  mode: "active" | "history";
  onEnd?: (partyId: string) => void;
}) {
  return (
    <article className="grid gap-4 rounded-[28px] border border-line bg-surface p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:grid-cols-[1fr_auto] md:items-center">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xl font-semibold text-slate-950">{props.party.name}</h4>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              props.party.status === "active"
                ? "bg-mint/30 text-slate-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {props.party.status === "active" ? "진행 중" : "종료됨"}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          시작 {new Date(props.party.startedAt).toLocaleString("ko-KR")}
          {props.party.endedAt
            ? ` · 종료 ${new Date(props.party.endedAt).toLocaleString("ko-KR")}`
            : ""}
        </p>
        <p className="text-sm text-slate-600">
          {props.mode === "active"
            ? "이 파티의 멤버를 조정하고 바로 새 게임을 만들 수 있습니다."
            : "기록을 검토하거나 과거 게임을 다시 열어볼 수 있습니다."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Link
          className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
          href={`/g/${props.slug}/parties/${props.party.id}`}
        >
          파티 열기
        </Link>
        {props.party.status === "active" && props.onEnd ? (
          <button
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => props.onEnd?.(props.party.id)}
            type="button"
          >
            파티 종료
          </button>
        ) : null}
      </div>
    </article>
  );
}
