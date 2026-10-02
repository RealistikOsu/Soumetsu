import { db } from '$server/db';

const COLOURS: Record<string, string> = {
  danger: 'c-red',
  success: 'c-green',
  info: 'c-blue',
  primary: 'c-blue',
  warning: 'c-yellow'
};

export interface Group {
  name: string;
  colour: string;
}

// Each privilege value maps to the group the panel named it after; unmatched values show as unknown.
export async function groupsFor(values: number[]) {
  const unique = [...new Set(values)];
  const rows = await db.privileges_groups.findMany({ where: { privileges: { in: unique } } });
  const groups: Record<number, Group> = {};
  for (const value of unique) {
    const row = rows.find((r) => r.privileges === value);
    groups[value] = row
      ? { name: row.name, colour: COLOURS[row.color] ?? 'c-grey' }
      : { name: `Unknown (${value})`, colour: 'c-red' };
  }
  return groups;
}
