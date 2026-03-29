import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  appEnv,
  getAdminCredentials,
  getDatabaseUrl,
} from "@/lib/env";
import { isValidAdminSessionToken } from "@/lib/security/admin-session";

const ADMIN_COOKIE_NAME = "gtm-admin-session";

export function getAdminSessionSecret() {
  const credentials = getAdminCredentials();

  if (!credentials) {
    return null;
  }

  return `${getDatabaseUrl()}|${credentials.username}|${credentials.password}`;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function getAdminSessionMinutes() {
  return appEnv.ADMIN_SESSION_MINUTES;
}

export function isAdminConfigured() {
  return getAdminCredentials() !== null;
}

export function getAdminLoginHref(nextPath = "/admin") {
  return `/admin/login?next=${encodeURIComponent(nextPath)}`;
}

export function hasAdminSession(
  cookieStore:
    | Awaited<ReturnType<typeof cookies>>
    | { get(name: string): { value: string } | undefined },
) {
  const credentials = getAdminCredentials();
  const secret = getAdminSessionSecret();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!credentials || !secret || !token) {
    return false;
  }

  return isValidAdminSessionToken({
    token,
    username: credentials.username,
    secret,
  });
}

export async function requireAdminSession(nextPath = "/admin") {
  const cookieStore = await cookies();

  if (!hasAdminSession(cookieStore)) {
    redirect(getAdminLoginHref(nextPath));
  }
}

export function getAdminSessionSecretForTests() {
  return getAdminSessionSecret();
}
