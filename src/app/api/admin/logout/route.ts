import { NextResponse } from "next/server";

import { getAdminCookieName } from "@/lib/server/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
