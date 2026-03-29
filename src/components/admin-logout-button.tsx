"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setMessage("로그아웃에 실패했습니다.");
        return;
      }

      setMessage(null);
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <button
        className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950 disabled:cursor-not-allowed"
        disabled={isPending}
        onClick={handleLogout}
        type="button"
      >
        {isPending ? "로그아웃 중..." : "로그아웃"}
      </button>
      {message ? <p className="text-sm text-rose-700">{message}</p> : null}
    </div>
  );
}
