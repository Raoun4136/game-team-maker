"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminLogoutButton } from "@/components/admin-logout-button";
import {
  AdminEventRecord,
  AdminGroupRecord,
  AdminPartyRecord,
  filterAdminEvents,
  filterAdminGroups,
  filterAdminParties,
  GroupFilterStatus,
  GroupSortMode,
  groupNeedsAttention,
  PartyFilterStatus,
  sortAdminGroups,
} from "@/features/admin/dashboard";

type AdminDashboardProps = {
  summary: {
    groups: number;
    activeMembers: number;
    archivedMembers: number;
    parties: number;
    activeParties: number;
    games: number;
    auditEvents: number;
  };
  groups: AdminGroupRecord[];
  recentEvents: AdminEventRecord[];
  recentParties: AdminPartyRecord[];
};

const groupFilters: Array<{ label: string; value: GroupFilterStatus }> = [
  { label: "전체", value: "all" },
  { label: "진행 중 파티", value: "active-parties" },
  { label: "주의 필요", value: "attention" },
];

const partyFilters: Array<{ label: string; value: PartyFilterStatus }> = [
  { label: "전체", value: "all" },
  { label: "진행 중", value: "active" },
  { label: "종료됨", value: "ended" },
];

export function AdminDashboard({
  summary,
  groups,
  recentEvents,
  recentParties,
}: AdminDashboardProps) {
  const [groupQuery, setGroupQuery] = useState("");
  const [groupStatus, setGroupStatus] = useState<GroupFilterStatus>("all");
  const [groupSort, setGroupSort] = useState<GroupSortMode>("recent");
  const [eventQuery, setEventQuery] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyStatus, setPartyStatus] = useState<PartyFilterStatus>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredGroups = sortAdminGroups(
    filterAdminGroups(groups, {
      query: groupQuery,
      status: groupStatus,
    }),
    groupSort,
  );
  const filteredEvents = filterAdminEvents(recentEvents, eventQuery);
  const filteredParties = filterAdminParties(recentParties, {
    query: partyQuery,
    status: partyStatus,
  });

  async function copyGroupLink(slug: string) {
    const target = `${window.location.origin}/g/${slug}`;

    try {
      await navigator.clipboard.writeText(target);
      setFeedback(`/${slug} 링크를 복사했습니다.`);
    } catch {
      setFeedback("링크 복사에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-6">
      <header className="rounded-[32px] border border-line bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Admin Dashboard
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              전체 운영 현황
            </h1>
            <p className="text-sm leading-7 text-slate-600">
              그룹을 빠르게 찾고, 상태를 한눈에 판단하고, 바로 로그나 파티로 이동합니다.
            </p>
          </div>
          <div className="grid gap-2 justify-items-end">
            <AdminLogoutButton />
            {feedback ? (
              <p className="text-sm text-slate-500">{feedback}</p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <MetricCard label="Groups" value={String(summary.groups)} />
        <MetricCard label="Active Members" value={String(summary.activeMembers)} />
        <MetricCard label="Archived" value={String(summary.archivedMembers)} />
        <MetricCard label="Parties" value={String(summary.parties)} />
        <MetricCard label="Active Parties" value={String(summary.activeParties)} />
        <MetricCard label="Games" value={String(summary.games)} />
        <MetricCard label="Audit Logs" value={String(summary.auditEvents)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Groups
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  그룹별 요약
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    그룹 검색
                  </label>
                  <input
                    className="h-11 min-w-[220px] rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
                    onChange={(event) => setGroupQuery(event.target.value)}
                    placeholder="이름 또는 slug"
                    value={groupQuery}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    정렬
                  </label>
                  <select
                    className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
                    onChange={(event) =>
                      setGroupSort(event.target.value as GroupSortMode)
                    }
                    value={groupSort}
                  >
                    <option value="recent">최근 활동순</option>
                    <option value="size">활성 멤버순</option>
                    <option value="games">게임 수순</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {groupFilters.map((filter) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    groupStatus === filter.value
                      ? "bg-slate-950 text-white"
                      : "border border-line bg-white text-slate-700 hover:border-slate-900 hover:text-slate-950"
                  }`}
                  key={filter.value}
                  onClick={() => setGroupStatus(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredGroups.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
                  현재 필터 조건에 맞는 그룹이 없습니다.
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div
                    className="grid gap-4 rounded-[24px] border border-line bg-surface p-5"
                    key={group.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="grid gap-1">
                        <Link
                          className="text-lg font-semibold text-slate-950 hover:text-slate-700"
                          href={`/g/${group.slug}`}
                        >
                          {group.name}
                        </Link>
                        <p className="text-xs text-slate-500">/{group.slug}</p>
                        <p className="text-xs text-slate-500">
                          최근 활동{" "}
                          {group.lastEventAt
                            ? new Date(group.lastEventAt).toLocaleString("ko-KR")
                            : "기록 없음"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.activeParties > 0 ? (
                          <StatusPill tone="green">진행 중 파티</StatusPill>
                        ) : null}
                        {groupNeedsAttention(group) ? (
                          <StatusPill tone="amber">주의 필요</StatusPill>
                        ) : null}
                        {group.archivedMembers > 0 ? (
                          <StatusPill tone="slate">
                            비활성 {group.archivedMembers}
                          </StatusPill>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      <StatChip label="활성 멤버" value={`${group.activeMembers}`} />
                      <StatChip label="비활성 멤버" value={`${group.archivedMembers}`} />
                      <StatChip label="파티" value={`${group.parties}`} />
                      <StatChip label="활성 파티" value={`${group.activeParties}`} />
                      <StatChip label="게임" value={`${group.games}`} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <QuickLink href={`/g/${group.slug}`}>Overview</QuickLink>
                      <QuickLink href={`/g/${group.slug}/parties`}>Parties</QuickLink>
                      <QuickLink href={`/g/${group.slug}/members`}>Members</QuickLink>
                      <QuickLink href={`/g/${group.slug}/logs`}>Logs</QuickLink>
                      <button
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                        onClick={() => copyGroupLink(group.slug)}
                        type="button"
                      >
                        링크 복사
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Logs
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  최근 변경 로그
                </h2>
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  로그 검색
                </label>
                <input
                  className="h-11 min-w-[220px] rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
                  onChange={(event) => setEventQuery(event.target.value)}
                  placeholder="actor, event, summary"
                  value={eventQuery}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {filteredEvents.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
                  현재 검색 조건에 맞는 로그가 없습니다.
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    className="rounded-[24px] border border-line bg-surface p-4"
                    key={event.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link
                        className="text-sm font-medium text-slate-950 hover:text-slate-700"
                        href={`/g/${event.groupSlug}/logs`}
                      >
                        {event.groupName}
                      </Link>
                      <span className="font-mono text-xs text-slate-500">
                        {event.eventType}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {event.changeSummary}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {event.actorName} · {new Date(event.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="grid gap-2">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                    Recent Parties
                  </p>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    최근 파티
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      파티 검색
                    </label>
                    <input
                      className="h-11 min-w-[220px] rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
                      onChange={(event) => setPartyQuery(event.target.value)}
                      placeholder="파티명 또는 그룹명"
                      value={partyQuery}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      상태
                    </label>
                    <select
                      className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
                      onChange={(event) =>
                        setPartyStatus(event.target.value as PartyFilterStatus)
                      }
                      value={partyStatus}
                    >
                      {partyFilters.map((filter) => (
                        <option key={filter.value} value={filter.value}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {partyFilters.map((filter) => (
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      partyStatus === filter.value
                        ? "bg-slate-950 text-white"
                        : "border border-line bg-white text-slate-700 hover:border-slate-900 hover:text-slate-950"
                    }`}
                    key={filter.value}
                    onClick={() => setPartyStatus(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {filteredParties.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
                  아직 기록된 파티가 없습니다.
                </div>
              ) : (
                filteredParties.map((party) => (
                  <div
                    className="rounded-[24px] border border-line bg-surface p-4"
                    key={party.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link
                        className="text-sm font-medium text-slate-950 hover:text-slate-700"
                        href={`/g/${party.groupSlug}/parties/${party.id}`}
                      >
                        {party.name}
                      </Link>
                      <StatusPill
                        tone={party.status === "active" ? "green" : "slate"}
                      >
                        {party.status}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{party.groupName}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      시작 {new Date(party.startedAt).toLocaleString("ko-KR")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <QuickLink href={`/g/${party.groupSlug}`}>
                        Group
                      </QuickLink>
                      <QuickLink href={`/g/${party.groupSlug}/parties/${party.id}`}>
                        Party
                      </QuickLink>
                      <QuickLink href={`/g/${party.groupSlug}/logs`}>Logs</QuickLink>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
        {props.value}
      </p>
    </article>
  );
}

function StatChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-white px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{props.value}</p>
    </div>
  );
}

function QuickLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
      href={props.href}
    >
      {props.children}
    </Link>
  );
}

function StatusPill(props: {
  children: React.ReactNode;
  tone: "green" | "amber" | "slate";
}) {
  const className =
    props.tone === "green"
      ? "bg-mint/30 text-slate-800"
      : props.tone === "amber"
        ? "bg-sun/25 text-slate-800"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {props.children}
    </span>
  );
}
