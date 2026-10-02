import { db } from '$server/db';
import { Failure } from '$server/respond';

const COLOURS: Record<string, string> = {
  danger: 'c-red',
  success: 'c-green',
  green: 'c-green',
  info: 'c-blue',
  primary: 'c-purple',
  warning: 'c-yellow'
};

export const colourOf = (stored: string) => COLOURS[stored] ?? 'c-grey';

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
      ? { name: row.name, colour: colourOf(row.color) }
      : { name: `Unknown (${value})`, colour: 'c-red' };
  }
  return groups;
}

export interface GroupBody {
  name: string;
  privileges: number;
  colour: string;
}

export function parseGroup(body: Partial<GroupBody>) {
  const name = (body.name ?? '').trim();
  const privileges = Number(body.privileges);
  if (!name || !Number.isInteger(privileges) || privileges < 0 || privileges > 0x7fffffff) {
    throw new Failure(400, 'auth.validation_error');
  }
  return { name, privileges, color: body.colour ?? '' };
}
