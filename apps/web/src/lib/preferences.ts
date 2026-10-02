// Per-browser view settings. Storage can be missing or throw (private windows, blocked site data),
// and the page works the same without it.
export function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Nothing to do, the choice just won't be remembered.
  }
}
