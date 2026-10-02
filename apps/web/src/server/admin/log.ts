import { config } from '$server/config';
import { db } from '$server/db';

// Discord fetches the image itself, so it needs the public address the API serves avatars on.
export const avatarOf = (userId: number) =>
  `${config.appBaseUrl}/api/v2/assets/avatars/${userId}.png`;

export async function postWebhook(url: string, body: unknown) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => null);
}

// Every staff action is written to the action log, worded as RealistikPanel worded it, and mirrored to Discord.
export async function rapLog(userId: number, text: string) {
  await db.rap_logs.create({
    data: { userid: userId, text, datetime: Math.floor(Date.now() / 1000), through: 'Soumetsu' }
  });

  const who = await db.users.findUnique({ where: { id: userId }, select: { username: true } });
  const name = who?.username ?? String(userId);
  await postWebhook(config.adminLogWebhook, {
    embeds: [
      {
        description: `${name} ${text}`,
        color: 242424,
        footer: { text: 'Soumetsu Admin Logs' },
        author: {
          name: `New action done by ${name}!`,
          url: `${config.appBaseUrl}/users/${userId}`,
          icon_url: avatarOf(userId)
        }
      }
    ]
  });
}
