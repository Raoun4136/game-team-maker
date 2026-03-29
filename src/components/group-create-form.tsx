"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type CreateGroupState = {
  error: string | null;
};

export function GroupCreateForm() {
  const router = useRouter();
  const [state, setState] = useState<CreateGroupState>({ error: null });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; slug?: string }
        | null;

      if (!response.ok || !data?.slug) {
        setState({
          error: data?.error ?? "그룹 생성에 실패했습니다. 설정과 DB 연결을 확인해 주세요.",
        });
        return;
      }

      setState({ error: null });
      router.push(`/g/${data.slug}`);
    });
  }

  return (
    <form
      className="grid gap-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="name">
          그룹 이름
        </label>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-slate-900"
          id="name"
          name="name"
          placeholder="예: 금요일 내전"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          그룹 비밀번호
        </label>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-slate-900"
          id="password"
          minLength={4}
          name="password"
          placeholder="민감한 수정 보호용 4자 이상"
          required
          type="password"
        />
        <p className="text-sm text-slate-500">
          그룹 생성 시 반드시 설정합니다. 결과 수정, 게임 삭제, 멤버 비활성화에 사용됩니다.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="h-12 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "그룹 생성 중..." : "그룹 만들기"}
      </button>
    </form>
  );
}
