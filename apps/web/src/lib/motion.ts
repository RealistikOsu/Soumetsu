export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ms = (value: number) => (reducedMotion() ? 0 : value);
