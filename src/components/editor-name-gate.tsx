"use client";

import { FormEvent, useState } from "react";

import {
  getStoredEditorName,
  setStoredEditorName,
} from "@/lib/client/editor-name";

export function EditorNameGate() {
  const initialName = typeof window === "undefined" ? "" : getStoredEditorName();
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    setStoredEditorName(draft);
    setName(draft.trim());
  }

  return (
    <div className="rounded-[24px] border border-line bg-white/80 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Editor
          </p>
          <p className="text-sm text-slate-700">
            {name ? `현재 수정자: ${name}` : "아직 수정자 이름이 없습니다."}
          </p>
        </div>
        <div className="flex flex-1 gap-2 sm:justify-end">
          <input
            className="h-10 flex-1 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900 sm:max-w-xs"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="수정자 이름"
            value={draft}
          />
          <button
            className="rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            type="submit"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
