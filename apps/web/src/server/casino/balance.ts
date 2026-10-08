import { db } from '$server/db';

export async function balanceOf(userId: number) {
  const user = await db.users.findUnique({ where: { id: userId }, select: { coins: true } });
  return user?.coins ?? 0;
}
