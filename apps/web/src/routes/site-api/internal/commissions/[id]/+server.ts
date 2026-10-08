import { timingSafeEqual } from 'node:crypto';
import { idOf } from '$server/admin/common';
import { summaryFor } from '$server/commissions/summary';
import { config } from '$server/config';
import { Failure, handle, ok } from '$server/respond';

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const GET = handle(async ({ request, params }) => {
  if (!config.internalToken) throw new Failure(404, 'site.not_configured');
  if (!matches(request.headers.get('x-internal-token') ?? '', config.internalToken)) {
    throw new Failure(403, 'site.forbidden');
  }
  return ok(await summaryFor(idOf(params)));
});
