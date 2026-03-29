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

  return (
    <section className="grid gap-4 lg:grid-cols-3">
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
