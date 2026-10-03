import { requireCaller } from '$server/auth';
import { deleteUploadedSet } from '$server/beatmaps';
import { Failure, handle, ok } from '$server/respond';

export const DELETE = handle(async ({ params, request }) => {
  const caller = await requireCaller(request);
  const setId = Number(params.id);
  if (!Number.isInteger(setId)) throw new Failure(404, 'beatmaps.beatmap_not_found');
  await deleteUploadedSet(setId, caller);
  return ok();
});
