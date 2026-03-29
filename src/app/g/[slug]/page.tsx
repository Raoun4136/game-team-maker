import { listActiveMembers, listGroupAuditEvents } from "@/lib/queries/groups";

type GroupPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { slug } = await params;
  const [members, auditEvents] = await Promise.all([
    listActiveMembers(slug),
    listGroupAuditEvents(slug),
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
      <PlaceholderCard
        title="Members"
        description="다음 단계에서 멤버 생성/수정/비활성화와 그룹 비밀번호 보호를 붙입니다."
      />
      <PlaceholderCard
        title="Parties"
        description="파티 생성, 참가자 풀 구성, 게임 히스토리와 파티 누적 전적 영역이 이어집니다."
      />
      <PlaceholderCard
        title="Logs"
        description="이미 DB에는 감사 로그가 쌓이기 시작했고, 전용 페이지에서 그룹 히스토리를 볼 수 있습니다."
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

function PlaceholderCard(props: { title: string; description: string }) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <h2 className="text-lg font-semibold text-slate-950">{props.title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{props.description}</p>
    </article>
  );
}
