import { listGroupAuditEvents } from "@/lib/queries/groups";

type LogsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LogsPage({ params }: LogsPageProps) {
  const { slug } = await params;
  const events = await listGroupAuditEvents(slug);

  return (
    <section className="rounded-[32px] border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          기록
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          기록
        </h2>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">시간</th>
              <th className="px-4 py-3 font-medium">수정자</th>
              <th className="px-4 py-3 font-medium">이벤트</th>
              <th className="px-4 py-3 font-medium">요약</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={4}>
                  아직 기록된 로그가 없습니다.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr className="border-t border-line" key={event.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {event.createdAt.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{event.actorName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {event.eventType}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{event.changeSummary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
