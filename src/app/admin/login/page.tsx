import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import {
  hasAdminSession,
  isAdminConfigured,
} from "@/lib/server/admin-auth";

type AdminLoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next || "/admin";
  const configured = isAdminConfigured();
  const cookieStore = await cookies();

  if (configured && hasAdminSession(cookieStore)) {
    redirect(nextPath);
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-6 rounded-[32px] border border-line bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Admin
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
          운영자 로그인
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          그룹 전체 현황과 최근 수정 로그를 확인하는 전역 운영자 화면입니다.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-[24px] border border-dashed border-line bg-surface px-5 py-5 text-sm leading-7 text-slate-600">
          아직 admin 계정이 설정되지 않았습니다.
          <br />
          `.env` 또는 Vercel 환경변수에 `ADMIN_USERNAME`, `ADMIN_PASSWORD`를 넣으면
          로그인할 수 있습니다.
        </div>
      ) : (
        <AdminLoginForm nextPath={nextPath} />
      )}
    </section>
  );
}
