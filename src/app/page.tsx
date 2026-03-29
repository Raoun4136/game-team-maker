import Link from "next/link";
import { GroupCreateForm } from "@/components/group-create-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-10 lg:px-10 lg:py-14">
      <div className="flex justify-end">
        <Link
          className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
          href="/admin/login"
        >
          Admin
        </Link>
      </div>
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="grid gap-6">
          <p className="w-fit rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-slate-600">
            Random team maker for Discord in-house matches
          </p>
          <div className="grid gap-4">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 md:text-7xl">
              내전 운영을
              <span className="block text-slate-600">기록 가능한 팀 메이커로 바꿉니다.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              그룹 링크 하나로 멤버를 모으고, 파티를 만들고, 직전 게임 설정을 불러와
              다음 판을 바로 돌릴 수 있습니다. 팀은 랜덤으로 뽑되, 제약 조건은 엄격하게
              지킵니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard
              eyebrow="Flow"
              title="직전 게임에서 바로 시작"
              description="참가 멤버와 옵션을 불러온 뒤 이번 판에 맞게 조금만 수정합니다."
            />
            <FeatureCard
              eyebrow="Rules"
              title="랜덤 + 제약 조건"
              description="같은 팀, 다른 팀, 팀 고정 조건을 조합해도 충돌은 먼저 막습니다."
            />
            <FeatureCard
              eyebrow="History"
              title="그룹 누적과 파티 누적"
              description="전체 전적과 오늘 파티 안의 전적을 나눠서 볼 수 있습니다."
            />
          </div>
        </div>

        <div className="grid gap-4">
          <GroupCreateForm />
          <Link
            className="w-fit text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
            href="/admin/login"
          >
            운영자 페이지로 이동
          </Link>
          <div className="rounded-[28px] border border-line bg-slate-950 px-6 py-5 text-sm text-slate-200 shadow-[0_18px_55px_rgba(15,23,42,0.2)]">
            <p className="font-medium text-white">MVP에 이미 고정된 규칙</p>
            <ul className="mt-3 grid gap-2 text-slate-300">
              <li>2팀 고정</li>
              <li>승/패만 기록</li>
              <li>민감한 수정은 그룹 비밀번호 필요</li>
              <li>멤버 삭제 대신 비활성화</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard(props: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.eyebrow}
      </p>
      <h2 className="mt-3 text-xl font-semibold text-slate-950">{props.title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{props.description}</p>
    </article>
  );
}
