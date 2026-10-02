import { listDocs } from '$server/docs';
import { handle, ok } from '$server/respond';

export const GET = handle(async () => ok(await listDocs()));
