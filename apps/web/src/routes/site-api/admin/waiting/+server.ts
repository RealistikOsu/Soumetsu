import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { rankableModes, visibleRequests } from '$server/admin/ranking';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

// The counts on the panel's tabs. Reports stay at zero for staff who can't open them, and requests are only the
// ones in modes the viewer may rank, like the list.
export const GET = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  const canReports = (caller.privileges & Privilege.AdminManageReport) !== 0;

  const [requests, reports, messageReports] = await Promise.all([
    db.$queryRawUnsafe<{ total: bigint }[]>(
      `SELECT COUNT(*) AS total ${visibleRequests(rankableModes(caller.privileges))}`
    ),
    canReports
      ? db.$queryRaw<
          { total: bigint }[]
        >`SELECT COUNT(*) AS total FROM reports WHERE resolved_at IS NULL`
      : null,
    canReports
      ? db.$queryRaw<
          { total: bigint }[]
        >`SELECT COUNT(*) AS total FROM chat_reports WHERE resolved_at IS NULL`
      : null
  ]);

  return ok({
    requests: Number(requests[0].total),
    reports: Number(reports?.[0]?.total ?? 0),
    messageReports: Number(messageReports?.[0]?.total ?? 0)
  });
});
