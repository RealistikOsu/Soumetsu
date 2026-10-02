import { env } from '$env/dynamic/private';

function required(name: string) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const optional = (name: string) => env[name] ?? '';

export const config = {
  apiUrl: required('API_URL'),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  appBaseUrl: required('APP_BASE_URL').replace(/\/$/, ''),
  mirrorUrl: (optional('MIRROR_URL') || 'https://mirror.ussr.pl').replace(/\/$/, ''),
  docsPath: optional('DOCS_PATH') || '../../website-docs',
  // Only behind a proxy that sets X-Real-IP itself; otherwise anyone could claim any address.
  trustProxy: optional('TRUST_PROXY') === 'true',
  hcaptchaSecret: optional('HCAPTCHA_SECRET_KEY'),
  brevoApiKey: optional('BREVO_API_KEY'),
  brevoFrom: optional('BREVO_FROM'),
  discordUrl: optional('DISCORD_SERVER_URL'),
  osu: { id: optional('OSU_CLIENT_ID'), secret: optional('OSU_CLIENT_SECRET') },
  twitch: { id: optional('TWITCH_APP_CLIENT_ID'), secret: optional('TWITCH_APP_CLIENT_SECRET') },
  stripe: { key: optional('STRIPE_SECRET_KEY'), webhookSecret: optional('STRIPE_WEBHOOK_SECRET') },
  paypalEmail: optional('PAYPAL_EMAIL_ADDRESS'),
  freekassa: {
    merchantId: optional('FREEKASSA_MERCHANT_ID'),
    secret1: optional('FREEKASSA_SECRET_WORD_1'),
    secret2: optional('FREEKASSA_SECRET_WORD_2')
  }
};
