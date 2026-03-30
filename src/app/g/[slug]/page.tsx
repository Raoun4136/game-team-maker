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

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[32px] border border-line bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              그룹
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              그룹 요약
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              이 화면은 현재 그룹 상태와 최근 기록만 보여줍니다. 실제 운영은 파티와 게임 화면에서 이어집니다.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SummaryCard
              description={
                activeParty
                  ? `시작 ${new Date(activeParty.startedAt).toLocaleString("ko-KR")}`
                  : "현재 진행 중인 파티가 없습니다."
              }
              href={activeParty ? `/g/${slug}/parties/${activeParty.id}` : `/g/${slug}/parties`}
              linkLabel={activeParty ? "진행 중인 파티 열기" : "파티 목록 보기"}
              title={activeParty ? activeParty.name : "진행 중인 파티 없음"}
            />
            <SummaryCard
              description={
                latestParty
                  ? `${latestParty.name} · ${latestParty.status === "active" ? "진행 중" : "종료됨"}`
                  : "아직 생성된 파티가 없습니다."
              }
              href={`/g/${slug}/parties`}
              linkLabel="파티 보기"
              title="최근 파티"
            />
          </div>
        </article>

        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <InfoCard
            title="활성 멤버"
            value={String(members.length)}
            description="현재 비활성화되지 않은 멤버 수"
          />
          <InfoCard
            title="기록 수"
            value={String(auditEvents.length)}
            description="이 그룹에 쌓인 변경 기록 수"
          />
          <InfoCard
            title="운영 규칙"
            value="2팀"
            description="랜덤 팀 편성 + 옵션 고정"
          />
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PreviewCard
          items={parties.slice(0, 4).map((party) => ({
            title: party.name,
            subtitle: party.status === "active" ? "진행 중" : "종료됨",
          }))}
          title="최근 파티"
        />
        <PreviewCard
          items={standings.slice(0, 4).map((row) => ({
            title: row.memberName,
            subtitle: `${row.wins}W ${row.losses}L`,
          }))}
          title="그룹 전적"
        />
        <PreviewCard
          items={auditEvents.slice(0, 4).map((event) => ({
            title: event.eventType,
            subtitle: event.changeSummary,
          }))}
          title="최근 기록"
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

function SummaryCard(props: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <article className="rounded-[28px] border border-line bg-surface p-5">
      <h3 className="text-2xl font-semibold text-slate-950">{props.title}</h3>
      <p className="mt-3 text-sm text-slate-600">{props.description}</p>
      <Link
        className="mt-4 inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
        href={props.href}
      >
        {props.linkLabel}
      </Link>
    </article>
  );
}
