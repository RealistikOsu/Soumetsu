import { intlLocale } from '$lib/i18n';
import { m } from '$lib/paraglide/messages';

export const number = (value: number, decimals = 0) =>
  value.toLocaleString(intlLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

// Rounded to days, months and years; Intl words it ("yesterday", "3 дня назад") in the chosen language.
export function timeAgo(unixSeconds: number) {
  const days = Math.floor((Date.now() / 1000 - unixSeconds) / 86_400);
  const relative = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });
  if (days < 31) return relative.format(-Math.max(days, 0), 'day');
  const months = Math.floor(days / 30);
  if (months < 12) return relative.format(-months, 'month');
  return relative.format(-Math.floor(days / 365), 'year');
}

export const monthYear = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });

export const fullDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

export const dateTime = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export function songParts(songName: string) {
  const match = songName.match(/^(.*) \[(.*)\]$/);
  return match ? { song: match[1], diff: match[2] } : { song: songName, diff: '' };
}

export const length = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Days by the viewer's own calendar, so "today" starts at their midnight.
const localDay = (unixSeconds: number) => {
  const date = new Date(unixSeconds * 1000);
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
};

export const sameDay = (a: number, b: number) => localDay(a) === localDay(b);

export function dayLabel(unixSeconds: number) {
  const days = localDay(Date.now() / 1000) - localDay(unixSeconds);
  if (days <= 0) return m.common_today();
  if (days === 1) return m.common_yesterday();
  return new Date(unixSeconds * 1000).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export const fromIso = (iso: string) => Date.parse(iso) / 1000;

export const clock = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleTimeString(intlLocale(), {
    hour: '2-digit',
    minute: '2-digit'
  });

// Daily challenge dates are UTC calendar days, so they're formatted in UTC whatever the viewer's zone.
export const utcDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
