import Link from "next/link";

import {
  getGroupBySlug,
  listActiveMembers,
  listGroupAuditEvents,
} from "@/lib/queries/groups";
import { listPartiesByGroup } from "@/lib/queries/parties";
import { getGroupStandings } from "@/lib/queries/standings";

type GroupPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  const [members, auditEvents, parties, standings] = await Promise.all([
    listActiveMembers(slug),
    listGroupAuditEvents(slug),
    listPartiesByGroup(slug),
    group ? getGroupStandings(group.id) : Promise.resolve([]),
  ]);
  const activeParty = parties.find((party) => party.status === "active") ?? null;
  const latestParty = parties[0] ?? null;
  const needsMemberSetup = members.length === 0;
  const needsPartySetup = parties.length === 0;
  const needsFirstGame = activeParty !== null && standings.length === 0;

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Overview
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                지금 이 그룹에서 해야 할 일
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                현재 진행 중인 파티를 확인하고, 멤버 로스터와 최근 기록을 바탕으로 다음
                라운드를 이어갑니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href={`/g/${slug}/parties`}>
                {activeParty ? "진행 중 파티 열기" : "파티 만들기"}
              </QuickLink>
              <QuickLink href={`/g/${slug}/members`}>멤버 관리</QuickLink>
              <QuickLink href={`/g/${slug}/logs`}>로그 보기</QuickLink>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[28px] border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                    Active Session
                  </p>
                  <h3 className="text-2xl font-semibold text-slate-950">
                    {activeParty ? activeParty.name : "진행 중인 파티가 없습니다"}
                  </h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    activeParty ? "bg-mint/30 text-slate-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {activeParty ? "진행 중" : "대기 중"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {activeParty
                  ? `시작 ${new Date(activeParty.startedAt).toLocaleString("ko-KR")} · 이 파티에서 다음 게임을 이어서 만들 수 있습니다.`
                  : "새 파티를 만들면 참가자 풀을 고르고 바로 게임을 시작할 수 있습니다."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <QuickLink href={activeParty ? `/g/${slug}/parties/${activeParty.id}` : `/g/${slug}/parties`}>
                  {activeParty ? "워크스페이스 열기" : "파티 목록으로 이동"}
                </QuickLink>
                {latestParty ? (
                  <QuickLink href={`/g/${slug}/parties/${latestParty.id}`}>
                    최근 파티 보기
                  </QuickLink>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-line bg-white p-5">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Attention
              </p>
              <div className="mt-3 grid gap-3">
                <AttentionRow
                  done={!needsMemberSetup}
                  text={
                    needsMemberSetup
                      ? "멤버가 아직 없습니다. 로스터부터 채워야 합니다."
                      : "멤버 로스터가 준비되었습니다."
                  }
                />
                <AttentionRow
                  done={!needsPartySetup}
                  text={
                    needsPartySetup
                      ? "아직 생성된 파티가 없습니다."
                      : "파티 히스토리가 있습니다."
                  }
                />
                <AttentionRow
                  done={!needsFirstGame}
                  text={
                    needsFirstGame
                      ? "진행 중인 파티가 있지만 결과가 기록된 게임은 아직 없습니다."
                      : "최근 결과와 전적을 확인할 수 있습니다."
                  }
                />
              </div>
            </div>
          </div>
        </article>

        <section className="grid gap-4">
          <InfoCard
            title="Active Members"
            value={String(members.length)}
            description="현재 비활성화되지 않은 멤버 수"
          />
          <InfoCard
            title="Audit Events"
            value={String(auditEvents.length)}
            description="이 그룹에 쌓인 로그 수"
          />
          <InfoCard
            title="Mode"
            value="MVP"
            description="2팀 고정, 랜덤 + 제약 조건"
          />
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PreviewCard
          items={parties.slice(0, 4).map((party) => ({
            title: party.name,
            subtitle: party.status === "active" ? "진행 중" : "종료됨",
          }))}
          title="Latest Parties"
        />
        <PreviewCard
          items={standings.slice(0, 4).map((row) => ({
            title: row.memberName,
            subtitle: `${row.wins}W ${row.losses}L`,
          }))}
          title="Group Standings"
        />
        <PreviewCard
          items={auditEvents.slice(0, 4).map((event) => ({
            title: event.eventType,
            subtitle: event.changeSummary,
          }))}
          title="Recent Logs"
        />
      </section>
    </div>
  );
}

function InfoCard(props: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.title}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
        {props.value}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{props.description}</p>
    </article>
  );
}

function PreviewCard(props: {
  title: string;
  items: Array<{ title: string; subtitle: string }>;
}) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <h2 className="text-lg font-semibold text-slate-950">{props.title}</h2>
      <div className="mt-3 grid gap-2">
        {props.items.length === 0 ? (
          <p className="text-sm text-slate-500">아직 데이터가 없습니다.</p>
        ) : (
          props.items.map((item) => (
            <div
              className="rounded-2xl border border-line bg-white/70 px-3 py-3"
              key={`${item.title}-${item.subtitle}`}
            >
              <p className="text-sm font-medium text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
            </div>
          ))
        )}
      </div>
    </article>
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

function AttentionRow(props: { done: boolean; text: string }) {
  return (
    <div className="flex gap-3 rounded-[20px] border border-line bg-surface px-4 py-3">
      <span
        className={`mt-0.5 size-2.5 rounded-full ${props.done ? "bg-mint" : "bg-sun"}`}
      />
      <p className="text-sm text-slate-700">{props.text}</p>
    </div>
  );
}
