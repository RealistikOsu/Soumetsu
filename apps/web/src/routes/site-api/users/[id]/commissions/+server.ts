import { idOf } from '$server/admin/common';
import { streaksFor } from '$server/commissions/service';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ params }) => ok(await streaksFor(idOf(params))));
