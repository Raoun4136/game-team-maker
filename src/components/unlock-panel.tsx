"use client";

import { FormEvent, useState, useTransition } from "react";

type UnlockPanelProps = {
  slug: string;
};

export function UnlockPanel({ slug }: UnlockPanelProps) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const response = await fetch(`/api/groups/${slug}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; expiresAt?: string }
        | null;

      if (!response.ok || !data?.expiresAt) {
        setMessage(data?.error ?? "잠금 해제에 실패했습니다.");
        return;
      }

      const formatted = new Date(data.expiresAt).toLocaleTimeString("ko-KR");
      setMessage(`민감한 수정이 ${formatted}까지 잠금 해제되었습니다.`);
      setPassword("");
    });
  }

  return (
    <div className="rounded-[24px] border border-line bg-white/80 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <form className="flex flex-col gap-3 lg:flex-row lg:items-end" onSubmit={handleSubmit}>
        <div className="grid flex-1 gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="unlock-password">
            그룹 비밀번호
          </label>
          <input
            className="h-11 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900"
            id="unlock-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="결과 수정, 게임 삭제, 멤버 비활성화 전에 잠금 해제"
            type="password"
            value={password}
          />
        </div>
        <button
          className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          disabled={isPending || password.trim().length === 0}
          type="submit"
        >
          {isPending ? "확인 중..." : "민감한 수정 잠금 해제"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
