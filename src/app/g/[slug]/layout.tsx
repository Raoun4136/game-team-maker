import { notFound } from "next/navigation";
import { ReactNode } from "react";

import { EditorNameGate } from "@/components/editor-name-gate";
import { NavTabs } from "@/components/nav-tabs";
import { getGroupBySlug, listArchivedMembers } from "@/lib/queries/groups";
import { listPartiesByGroup } from "@/lib/queries/parties";

type GroupLayoutProps = {
  children: ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupLayout({
  children,
  params,
}: GroupLayoutProps) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  const [parties, archivedMembers] = await Promise.all([
    listPartiesByGroup(slug),
    listArchivedMembers(slug),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10">
      <header className="rounded-[32px] border border-line bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          그룹
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2">
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              {group.name}
            </h1>
            <p className="text-sm text-slate-500">공유 링크 slug: {group.slug}</p>
          </div>
          <NavTabs
            activeParties={parties.filter((party) => party.status === "active").length}
            archivedMembers={archivedMembers.length}
            slug={group.slug}
          />
        </div>
      </header>
      <EditorNameGate />
      {children}
    </div>
  );
}
