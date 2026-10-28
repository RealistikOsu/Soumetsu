// How many fields of an edited copy differ from what was loaded, for the save bar's count.
export function countChanges<T extends object>(edited: T | null, loaded: T | null) {
  if (!edited || !loaded) return 0;
  return (Object.keys(edited) as (keyof T)[]).filter(
    (key) => JSON.stringify(edited[key]) !== JSON.stringify(loaded[key])
  ).length;
}
