import { describe, expect, test } from 'bun:test';
import { favouriteView } from './modes';

describe('favouriteView', () => {
  test('opens the favourite mode, client and mods', () => {
    expect(favouriteView(1, 4)).toEqual({ mode: 1, rx: 4 });
  });

  test("keeps the mode on the client's vanilla when the mods don't have it", () => {
    expect(favouriteView(3, 1)).toEqual({ mode: 3, rx: 0 });
    expect(favouriteView(3, 5)).toEqual({ mode: 3, rx: 3 });
  });

  test("falls back to osu! when nothing else fits, and ignores values it doesn't know", () => {
    expect(favouriteView(2, 2)).toEqual({ mode: 2, rx: 0 });
    expect(favouriteView(0, 9)).toEqual({ mode: 0, rx: 0 });
  });
});
