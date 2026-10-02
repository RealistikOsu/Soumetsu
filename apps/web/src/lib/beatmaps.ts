// Stable osu!'s colours, per difficulty: never label a whole set as ranked.
export interface Status {
  name: string;
  colour: string;
  icon: string;
}

const pending: Status = { name: 'Pending', colour: 's-pending', icon: 'fa-question' };

// The game server's ranked column (it is not the osu! API's approved value).
const statuses: Record<number, Status> = {
  2: { name: 'Ranked', colour: 's-ranked', icon: 'fa-angles-up' },
  3: { name: 'Approved', colour: 's-approved', icon: 'fa-check' },
  4: { name: 'Qualified', colour: 's-approved', icon: 'fa-check' },
  5: { name: 'Loved', colour: 's-loved', icon: 'fa-heart' }
};

export const statusOf = (ranked: number) => statuses[ranked] ?? pending;

// The mirror reports the osu! API's value: 1 ranked, 2 approved, 3 qualified, 4 loved.
const mirrorStatuses: Record<number, Status> = {
  1: statuses[2],
  2: statuses[3],
  3: statuses[4],
  4: statuses[5],
  '-1': { ...pending, name: 'WIP' },
  '-2': { ...pending, name: 'Graveyard' }
};

export const mirrorStatusOf = (value: number) => mirrorStatuses[value] ?? pending;

const STOPS: [number, string][] = [
  [0.1, '4290fb'],
  [1.25, '4fc0ff'],
  [2, '4fffd5'],
  [2.5, '7cff4f'],
  [3.3, 'f6f05c'],
  [4.2, 'ff8068'],
  [4.9, 'ff4e6f'],
  [5.8, 'c645b8'],
  [6.7, '6563de'],
  [7.7, '18158e'],
  [9, '000000']
];

export function starColour(stars: number) {
  if (stars <= STOPS[0][0]) return `#${STOPS[0][1]}`;
  for (let i = 1; i < STOPS.length; i++) {
    const [a, from] = STOPS[i - 1];
    const [b, to] = STOPS[i];
    if (stars > b) continue;
    const t = (stars - a) / (b - a);
    return (
      '#' +
      [0, 2, 4]
        .map((j) => {
          const start = parseInt(from.slice(j, j + 2), 16);
          const end = parseInt(to.slice(j, j + 2), 16);
          return Math.round(start + (end - start) * t)
            .toString(16)
            .padStart(2, '0');
        })
        .join('')
    );
  }
  return '#000000';
}

export const starTextColour = (stars: number) => (stars >= 6.5 ? '#ffd966' : '#000');

export const modeKeys = ['std', 'taiko', 'ctb', 'mania'] as const;

const byName: Record<string, Status> = {
  ranked: statuses[2],
  approved: statuses[3],
  qualified: statuses[4],
  loved: statuses[5],
  wip: { ...pending, name: 'WIP' },
  graveyard: { ...pending, name: 'Graveyard' }
};

// The v2 mirror names the status instead of numbering it.
export const mirrorStatusKey = (name: string) => byName[name.toLowerCase()] ?? pending;
