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
  const [isEditing, setIsEditing] = useState(initialName.length === 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    setStoredEditorName(draft);
    setName(draft.trim());
    setIsEditing(false);
  }

  return (
    <div className="rounded-[24px] border border-line bg-white/80 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Editor Identity
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                name ? "bg-mint/30 text-slate-800" : "bg-sun/30 text-slate-800"
              }`}
            >
              {name ? `현재 수정자: ${name}` : "수정자 이름 필요"}
            </span>
            <p className="text-sm text-slate-600">
              {name
                ? "모든 수정 로그에 이 이름이 기록됩니다."
                : "저장하기 전에는 수정 요청이 거절됩니다."}
            </p>
          </div>
        </div>

        {isEditing ? (
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end"
            onSubmit={handleSubmit}
          >
            <input
              className="h-10 flex-1 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-slate-900 sm:max-w-xs"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="수정자 이름"
              value={draft}
            />
            <div className="flex gap-2 sm:justify-end">
              {name ? (
                <button
                  className="rounded-2xl border border-line px-4 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                  onClick={() => {
                    setDraft(name);
                    setIsEditing(false);
                  }}
                  type="button"
                >
                  취소
                </button>
              ) : null}
              <button
                className="rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                type="submit"
              >
                저장
              </button>
            </div>
          </form>
        ) : (
          <button
            className="w-fit rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            수정자 이름 변경
          </button>
        )}
      </div>
    </div>
  );
}
