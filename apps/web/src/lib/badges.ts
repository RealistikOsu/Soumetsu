const colours = [
  'teal',
  'yellow',
  'blue',
  'red',
  'purple',
  'orange',
  'green',
  'pink',
  'violet',
  'olive'
];
const brands = ['fa-twitter', 'fa-discord', 'fa-twitch'];

// Badge icons are stored like prod's: an optional Semantic colour, then a Font Awesome name with or without fa-.
export function badgeIcon(stored: string) {
  const parts = stored.split(/\s+/).filter(Boolean);
  const colour = parts.find((part) => colours.includes(part));
  const name = parts.find((part) => !colours.includes(part) && part !== 'icon') ?? 'star';
  const icon = name.startsWith('fa-') ? name : `fa-${name}`;
  return {
    colour: colour
      ? `c-${colour === 'violet' ? 'purple' : colour === 'olive' ? 'green' : colour}`
      : 'c-grey',
    icon: `${brands.includes(icon) ? 'fa-brands' : 'fa-solid'} ${icon}`
  };
}
