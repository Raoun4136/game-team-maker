"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdminLoginFormProps = {
  nextPath?: string;
};

export function AdminLoginForm({ nextPath = "/admin" }: AdminLoginFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setMessage(data?.error ?? "Admin 로그인에 실패했습니다.");
        return;
      }

      setMessage(null);
      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="username">
          Admin ID
        </label>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-slate-900"
          id="username"
          name="username"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Admin Password
        </label>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-slate-900"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {message ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </p>
      ) : null}

      <button
        className="h-12 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "로그인 중..." : "Admin 로그인"}
      </button>
    </form>
  );
}
