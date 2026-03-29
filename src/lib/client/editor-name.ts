"use client";

const EDITOR_NAME_KEY = "game-team-maker.editor-name";

export function getStoredEditorName() {
  return window.localStorage.getItem(EDITOR_NAME_KEY)?.trim() ?? "";
}

export function setStoredEditorName(name: string) {
  window.localStorage.setItem(EDITOR_NAME_KEY, name.trim());
}

export function ensureEditorName() {
  const existingName = getStoredEditorName();

  if (existingName) {
    return existingName;
  }

  const promptedName = window.prompt("수정자 이름을 입력해 주세요.");

  if (!promptedName?.trim()) {
    throw new Error("수정자 이름이 필요합니다.");
  }

  setStoredEditorName(promptedName);

  return promptedName.trim();
}
