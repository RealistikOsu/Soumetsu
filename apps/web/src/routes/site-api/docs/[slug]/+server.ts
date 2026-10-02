import { readDoc } from '$server/docs';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ params, url }) => {
  const doc = await readDoc(params.slug ?? '', url.searchParams.get('lang'));
  if (!doc) throw new Failure(404, 'site.doc_not_found');
  return ok(doc);
});
