"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavTabsProps = {
  slug: string;
  activeParties: number;
  archivedMembers: number;
};

const tabs = [
  { href: "", label: "Overview", description: "지금 해야 할 일" },
  { href: "/parties", label: "Parties", description: "세션 운영" },
  { href: "/members", label: "Members", description: "로스터 관리" },
  { href: "/logs", label: "Logs", description: "변경 기록" },
];

export function NavTabs({ slug, activeParties, archivedMembers }: NavTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-3" aria-label="Group sections">
      {tabs.map((tab) => (
        <NavTab
          active={
            tab.href === ""
              ? pathname === `/g/${slug}`
              : pathname.startsWith(`/g/${slug}${tab.href}`)
          }
          badge={
            tab.href === "/parties"
              ? activeParties > 0
                ? `${activeParties} active`
                : null
              : tab.href === "/members"
                ? archivedMembers > 0
                  ? `${archivedMembers} archived`
                  : null
                : null
          }
          description={tab.description}
          href={`/g/${slug}${tab.href}`}
          key={tab.href || "overview"}
          label={tab.label}
        />
      ))}
    </nav>
  );
}

function NavTab(props: {
  href: string;
  label: string;
  description: string;
  active: boolean;
  badge: string | null;
}) {
  return (
    <Link
      aria-current={props.active ? "page" : undefined}
      className={`rounded-[20px] border px-4 py-3 text-left transition ${
        props.active
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
          : "border-line bg-white/80 text-slate-700 hover:border-slate-900 hover:text-slate-950"
      }`}
      href={props.href}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{props.label}</span>
        {props.badge ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              props.active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {props.badge}
          </span>
        ) : null}
      </div>
      <p className={`mt-1 text-xs ${props.active ? "text-white/75" : "text-slate-500"}`}>
        {props.description}
      </p>
    </Link>
  );
}
