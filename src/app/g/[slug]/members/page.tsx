import { MembersManager } from "@/components/members-manager";
import { UnlockPanel } from "@/components/unlock-panel";
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
    <div className="grid gap-4">
      <UnlockPanel slug={slug} />
      <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Members
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            현재 멤버 로스터
          </h2>
        </div>

        <div className="mt-6">
          <MembersManager
            initialMembers={members.map((member) => ({
              id: member.id,
              name: member.name,
              nickname: member.nickname,
            }))}
            slug={slug}
          />
        </div>
      </section>
    </div>
  );
}
