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
    <PartiesManager
      initialParties={parties.map((party) => ({
        ...party,
        startedAt: party.startedAt.toISOString(),
        endedAt: party.endedAt ? party.endedAt.toISOString() : null,
        createdAt: party.createdAt.toISOString(),
      }))}
      slug={slug}
    />
  );
}
