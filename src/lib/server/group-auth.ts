import { cookies } from "next/headers";

import { appEnv, getDatabaseUrl } from "@/lib/env";
import { isValidUnlockToken } from "@/lib/security/unlock-session";

export function getUnlockCookieName(groupSlug: string) {
  return `gtm-unlock-${groupSlug}`;
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
  const token = cookieStore.get(getUnlockCookieName(groupSlug))?.value;

  if (!token) {
    return false;
  }

  return isValidUnlockToken({
    token,
    groupSlug,
    secret: getUnlockSecret(),
  });
}

export function getSensitiveUnlockMinutes() {
  return appEnv.GROUP_PASSWORD_SESSION_MINUTES;
}

export function getUnlockSecretForTests() {
  return getUnlockSecret();
}
