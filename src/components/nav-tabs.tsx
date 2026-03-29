import Link from "next/link";

type NavTabsProps = {
  slug: string;
};

const tabs = [
  { href: "", label: "Overview" },
  { href: "/members", label: "Members" },
  { href: "/logs", label: "Logs" },
];

export function NavTabs({ slug }: NavTabsProps) {
  return (
    <nav className="flex flex-wrap gap-3">
      {tabs.map((tab) => (
        <Link
          className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
          href={`/g/${slug}${tab.href}`}
          key={tab.href || "overview"}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
