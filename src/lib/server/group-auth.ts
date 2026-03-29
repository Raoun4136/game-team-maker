import { cookies } from "next/headers";

import { appEnv, getDatabaseUrl } from "@/lib/env";
import { normalizeGroupSlug } from "@/lib/group-slug";
import {
  isValidUnlockToken,
  readUnlockTokenExpiresAt,
} from "@/lib/security/unlock-session";

export function getUnlockCookieName(groupSlug: string) {
  return `gtm-unlock-${encodeURIComponent(normalizeGroupSlug(groupSlug))}`;
}

function getUnlockSecret() {
  return getDatabaseUrl();
}

export function hasSensitiveUnlock(
  groupSlug: string,
  cookieStore:
    | Awaited<ReturnType<typeof cookies>>
    | { get(name: string): { value: string } | undefined },
) {
  const normalizedSlug = normalizeGroupSlug(groupSlug);
  const token = cookieStore.get(getUnlockCookieName(normalizedSlug))?.value;

  if (!token) {
    return false;
  }

  return isValidUnlockToken({
    token,
    groupSlug: normalizedSlug,
    secret: getUnlockSecret(),
  });
}

export function getSensitiveUnlockExpiresAt(
  groupSlug: string,
  cookieStore:
    | Awaited<ReturnType<typeof cookies>>
    | { get(name: string): { value: string } | undefined },
) {
  const normalizedSlug = normalizeGroupSlug(groupSlug);
  const token = cookieStore.get(getUnlockCookieName(normalizedSlug))?.value;

  if (!token) {
    return null;
  }

  if (
    !isValidUnlockToken({
      token,
      groupSlug: normalizedSlug,
      secret: getUnlockSecret(),
    })
  ) {
    return null;
  }

  return readUnlockTokenExpiresAt(token, normalizedSlug);
}

export function getSensitiveUnlockMinutes() {
  return appEnv.GROUP_PASSWORD_SESSION_MINUTES;
}

export function getUnlockSecretForTests() {
  return getUnlockSecret();
}
