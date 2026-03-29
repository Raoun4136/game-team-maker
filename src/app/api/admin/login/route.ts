import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminCredentials } from "@/lib/env";
import {
  getAdminCookieName,
  getAdminSessionMinutes,
  getAdminSessionSecretForTests,
  isAdminConfigured,
} from "@/lib/server/admin-auth";
import {
  buildAdminSessionExpiresAt,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/security/admin-session";

const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_USERNAME / ADMIN_PASSWORD 설정이 필요합니다." },
      { status: 503 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Admin 로그인 정보가 필요합니다." },
      { status: 400 },
    );
  }

  const credentials = getAdminCredentials();
  const secret = getAdminSessionSecretForTests();

  if (!credentials || !secret) {
    return NextResponse.json(
      { error: "ADMIN_USERNAME / ADMIN_PASSWORD 설정이 필요합니다." },
      { status: 503 },
    );
  }

  const matches = verifyAdminCredentials({
    expectedUsername: credentials.username,
    expectedPassword: credentials.password,
    username: parsed.data.username,
    password: parsed.data.password,
  });

  if (!matches) {
    return NextResponse.json(
      { error: "Admin ID 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const expiresAt = buildAdminSessionExpiresAt(getAdminSessionMinutes());
  const token = createAdminSessionToken({
    username: credentials.username,
    expiresAt,
    secret,
  });

  const response = NextResponse.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
  });

  response.cookies.set({
    name: getAdminCookieName(),
    value: token,
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
