type GroupPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10">
      <section className="rounded-[32px] border border-line bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Group
        </p>
        <div className="mt-4 grid gap-3">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
            {slug}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-600">
            그룹 대시보드의 첫 뼈대입니다. 다음 단계에서 멤버 로스터, 파티 목록, 로그,
            그리고 실제 게임 생성 플로우가 이 화면 아래로 들어옵니다.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PlaceholderCard
          title="Members"
          description="이 그룹의 멤버 로스터와 비활성화 상태를 관리합니다."
        />
        <PlaceholderCard
          title="Parties"
          description="파티 생성, 종료, 파티 누적 전적 보기, 직전 게임 복제 흐름이 들어옵니다."
        />
        <PlaceholderCard
          title="Logs"
          description="누가 언제 무엇을 추가/수정/삭제했는지 그룹 단위로 추적합니다."
        />
      </section>
    </main>
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
