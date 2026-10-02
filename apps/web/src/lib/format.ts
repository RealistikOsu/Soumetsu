export const number = (value: number, decimals = 0) =>
  value.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export function timeAgo(unixSeconds: number) {
  const days = Math.floor((Date.now() / 1000 - unixSeconds) / 86_400);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 31) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export const monthYear = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export const fullDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

export function songParts(songName: string) {
  const match = songName.match(/^(.*) \[(.*)\]$/);
  return match ? { song: match[1], diff: match[2] } : { song: songName, diff: '' };
}

export const length = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function dayLabel(unixSeconds: number) {
  const days = Math.floor(Date.now() / 86400000) - Math.floor(unixSeconds / 86400);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
