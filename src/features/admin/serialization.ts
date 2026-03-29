export function toIsoDateString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

export function toOptionalIsoDateString(value: Date | string | null) {
  if (value === null) {
    return null;
  }

  return toIsoDateString(value);
}
