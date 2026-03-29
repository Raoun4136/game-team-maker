import { AdminDashboard } from "@/components/admin-dashboard";
import {
  toIsoDateString,
  toOptionalIsoDateString,
} from "@/features/admin/serialization";
import {
  getAdminSummary,
  listAdminGroups,
  listRecentAdminAuditEvents,
  listRecentAdminParties,
} from "@/lib/queries/admin";
import { requireAdminSession } from "@/lib/server/admin-auth";

export default async function AdminPage() {
  await requireAdminSession();

  const [summary, groups, recentEvents, recentParties] = await Promise.all([
    getAdminSummary(),
    listAdminGroups(),
    listRecentAdminAuditEvents(),
    listRecentAdminParties(),
  ]);

  return (
    <AdminDashboard
      groups={groups.map((group) => ({
        ...group,
        createdAt: toIsoDateString(group.createdAt),
        lastEventAt: toOptionalIsoDateString(group.lastEventAt),
      }))}
      recentEvents={recentEvents.map((event) => ({
        ...event,
        createdAt: toIsoDateString(event.createdAt),
      }))}
      recentParties={recentParties.map((party) => ({
        ...party,
        startedAt: toIsoDateString(party.startedAt),
        endedAt: toOptionalIsoDateString(party.endedAt),
      }))}
      summary={summary}
    />
  );
}
