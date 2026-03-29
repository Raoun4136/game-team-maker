import { NextResponse } from "next/server";
import { z } from "zod";

import { requireGroupBySlug } from "@/lib/server/mutation-helpers";
import {
  getSensitiveUnlockMinutes,
  getUnlockCookieName,
  getUnlockSecretForTests,
} from "@/lib/server/group-auth";
import { buildUnlockExpiresAt, verifyGroupPassword } from "@/lib/security/password";
import { createUnlockToken } from "@/lib/security/unlock-session";

const unlockSchema = z.object({
  password: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const group = await requireGroupBySlug(slug);
  const payload = await request.json().catch(() => null);
  const parsed = unlockSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  if (!group.passwordHash) {
    return NextResponse.json(
      { error: "This group does not have a password configured." },
      { status: 400 },
    );
  }

  const matches = await verifyGroupPassword(parsed.data.password, group.passwordHash);

  if (!matches) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const expiresAt = buildUnlockExpiresAt(getSensitiveUnlockMinutes());
  const token = createUnlockToken({
    groupSlug: slug,
    expiresAt,
    secret: getUnlockSecretForTests(),
  });

  const response = NextResponse.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
  });

  response.cookies.set({
    name: getUnlockCookieName(slug),
    value: token,
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
