import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { saveCover } from '$server/news';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.AdminManageDocs);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new Failure(400, 'users.invalid_file_format');
  return ok(await saveCover(params.slug ?? '', file));
});
