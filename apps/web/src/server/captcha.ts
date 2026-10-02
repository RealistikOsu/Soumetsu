import { config } from './config';

// Without a secret key captchas are off, as on Hanayo.
export async function captchaPasses(token: string | undefined, ip: string) {
  if (!config.hcaptchaSecret) return true;
  if (!token) return false;

  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: config.hcaptchaSecret, response: token, remoteip: ip })
  });
  if (!response.ok) return false;
  return ((await response.json()) as { success?: boolean }).success === true;
}
