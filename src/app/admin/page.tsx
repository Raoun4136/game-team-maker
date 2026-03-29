import { AdminDashboard } from "@/components/admin-dashboard";
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
        createdAt: group.createdAt.toISOString(),
        lastEventAt: group.lastEventAt ? group.lastEventAt.toISOString() : null,
      }))}
      recentEvents={recentEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      }))}
      recentParties={recentParties.map((party) => ({
        ...party,
        startedAt: party.startedAt.toISOString(),
        endedAt: party.endedAt ? party.endedAt.toISOString() : null,
      }))}
      summary={summary}
    />
  );
}
