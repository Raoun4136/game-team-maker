import { PartiesManager } from "@/components/parties-manager";
import { listPartiesByGroup } from "@/lib/queries/parties";

type PartiesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PartiesPage({ params }: PartiesPageProps) {
  const { slug } = await params;
  const parties = await listPartiesByGroup(slug);

  return (
    <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Parties
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          파티 목록
        </h2>
      </div>
      <div className="mt-6">
        <PartiesManager
          initialParties={parties.map((party) => ({
            ...party,
            startedAt: party.startedAt.toISOString(),
            endedAt: party.endedAt ? party.endedAt.toISOString() : null,
            createdAt: party.createdAt.toISOString(),
          }))}
          slug={slug}
        />
      </div>
    </section>
  );
}
