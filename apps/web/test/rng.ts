// Hands out the given draws in order and fails the test if the game asks for more.
export function sequence(values: number[]) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error('rng drawn too often');
    return values[i++];
  };
  return Object.assign(rng, { used: () => i });
}
