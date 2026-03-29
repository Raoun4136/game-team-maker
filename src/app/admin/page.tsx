import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin-logout-button";
import {
  getAdminSummary,
  listAdminGroups,
  listRecentAdminAuditEvents,
  listRecentAdminParties,
} from "@/lib/queries/admin";
import { requireAdminSession } from "@/lib/server/admin-auth";

export default async function AdminPage() {
  await requireAdminSession();

  const [summary, groups, recentEvents, recentParties] = await Promise.all([
    getAdminSummary(),
    listAdminGroups(),
    listRecentAdminAuditEvents(),
    listRecentAdminParties(),
  ]);

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
              그룹, 파티, 게임, 최근 수정 로그를 한 화면에서 확인합니다.
            </p>
          </div>
          <AdminLogoutButton />
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

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Groups
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              그룹별 요약
            </h2>
          </div>
          <div className="mt-5 grid gap-4">
            {groups.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
                아직 생성된 그룹이 없습니다.
              </div>
            ) : (
              groups.map((group) => (
                <div
                  className="grid gap-3 rounded-[24px] border border-line bg-surface p-5 md:grid-cols-[1.4fr_repeat(5,auto)] md:items-center"
                  key={group.id}
                >
                  <div className="grid gap-1">
                    <Link
                      className="text-lg font-semibold text-slate-950 hover:text-slate-700"
                      href={`/g/${group.slug}`}
                    >
                      {group.name}
                    </Link>
                    <p className="text-xs text-slate-500">/{group.slug}</p>
                    <p className="text-xs text-slate-500">
                      생성 {group.createdAt.toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <StatChip label="활성 멤버" value={`${group.activeMembers}`} />
                  <StatChip label="비활성 멤버" value={`${group.archivedMembers}`} />
                  <StatChip label="파티" value={`${group.parties}`} />
                  <StatChip label="활성 파티" value={`${group.activeParties}`} />
                  <StatChip label="게임" value={`${group.games}`} />
                </div>
              ))
            )}
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Recent Parties
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                최근 파티
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              {recentParties.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
                  아직 기록된 파티가 없습니다.
                </div>
              ) : (
                recentParties.map((party) => (
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
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        {party.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{party.groupName}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      시작 {party.startedAt.toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Logs
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                최근 변경 로그
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              {recentEvents.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
                  아직 기록된 로그가 없습니다.
                </div>
              ) : (
                recentEvents.map((event) => (
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
                    <p className="mt-2 text-sm text-slate-700">{event.changeSummary}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {event.actorName} · {event.createdAt.toLocaleString("ko-KR")}
                    </p>
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
