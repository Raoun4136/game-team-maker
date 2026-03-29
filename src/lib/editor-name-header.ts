export function encodeEditorNameHeader(name: string) {
  return encodeURIComponent(name.trim());
}

export function decodeEditorNameHeader(value: string) {
  const trimmedValue = value.trim();

  try {
    return decodeURIComponent(trimmedValue).trim();
  } catch {
    return trimmedValue;
  }
}
