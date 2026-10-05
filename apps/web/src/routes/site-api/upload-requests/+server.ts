import { optionalCaller, requireCaller } from '$server/auth';
import { pageOf } from '$server/admin/common';
import { Failure, handle, ok } from '$server/respond';
import {
  MAX_REASON,
  MAX_SKIN,
  MAX_URL,
  STATUSES,
  listRequests,
  submit,
  type Status
} from '$server/uploads';

const text = (value: unknown, max: number) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length > max) throw new Failure(400, 'site.invalid_request');
  return trimmed;
};

const link = (value: unknown) => {
  const url = text(value, MAX_URL);
  if (!URL.canParse(url) || !/^https?:$/.test(new URL(url).protocol)) {
    throw new Failure(400, 'site.invalid_request');
  }
  return url;
};

export const GET = handle(async ({ request, url }) => {
  const caller = await optionalCaller(request);
  const status = url.searchParams.get('status') as Status;
  return ok(
    await listRequests(
      STATUSES.includes(status) ? status : 'pending',
      pageOf(url),
      caller?.id ?? null
    )
  );
});

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const reason = text(body?.reason, MAX_REASON);
  if (!reason) throw new Failure(400, 'site.invalid_request');

  await submit(caller.id, caller.privileges, {
    replayUrl: link(body?.replayUrl),
    mapUrl: link(body?.mapUrl),
    skin: text(body?.skin, MAX_SKIN),
    reason
  });
  return ok();
});
