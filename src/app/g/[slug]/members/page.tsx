import { MembersManager } from "@/components/members-manager";
import {
  listActiveMembers,
  listArchivedMembers,
} from "@/lib/queries/groups";

type MembersPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;
  const [members, archivedMembers] = await Promise.all([
    listActiveMembers(slug),
    listArchivedMembers(slug),
  ]);

  return (
    <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          멤버
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          멤버 관리
        </h2>
      </div>

      <div className="mt-6">
        <MembersManager
          initialArchivedMembers={archivedMembers.map((member) => ({
            id: member.id,
            name: member.name,
            nickname: member.nickname,
            archivedAt: member.archivedAt?.toISOString() ?? null,
          }))}
          initialMembers={members.map((member) => ({
            id: member.id,
            name: member.name,
            nickname: member.nickname,
          }))}
          slug={slug}
        />
      </div>
    </section>
  );
}
