import { listActiveMembers } from "@/lib/queries/groups";

type MembersPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;
  const members = await listActiveMembers(slug);

  return (
    <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Members
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          현재 멤버 로스터
        </h2>
      </div>

      <div className="mt-6 grid gap-3">
        {members.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-line px-5 py-6 text-sm text-slate-500">
            아직 멤버가 없습니다. 다음 단계에서 여기서 바로 멤버를 추가할 수 있게 붙입니다.
          </div>
        ) : (
          members.map((member) => (
            <article
              className="rounded-[20px] border border-line bg-surface px-5 py-4"
              key={member.id}
            >
              <p className="text-base font-semibold text-slate-950">{member.name}</p>
              <p className="text-sm text-slate-500">{member.nickname}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
