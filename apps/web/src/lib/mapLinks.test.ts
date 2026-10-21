import { describe, expect, test } from 'bun:test';
import { mapRef } from './mapLinks';

describe('mapRef', () => {
  test('reads a difficulty from a set link that ends in one', () => {
    expect(mapRef('https://osu.ppy.sh/beatmapsets/2448588#osu/5358459')).toEqual({
      beatmap: 5358459
    });
    expect(mapRef('https://ussr.pl/beatmapsets/2448588/#mania/5358459')).toEqual({
      beatmap: 5358459
    });
  });

  test('reads a set link without a difficulty as the set', () => {
    expect(mapRef('https://osu.ppy.sh/beatmapsets/2448588')).toEqual({ set: 2448588 });
    expect(mapRef('osu.ppy.sh/s/2448588')).toEqual({ set: 2448588 });
  });

  test('reads beatmap links', () => {
    expect(mapRef('https://osu.ppy.sh/beatmaps/5358459')).toEqual({ beatmap: 5358459 });
    expect(mapRef('https://osu.ppy.sh/b/5358459?m=0')).toEqual({ beatmap: 5358459 });
    expect(mapRef('https://ussr.pl/b/5358459')).toEqual({ beatmap: 5358459 });
  });

  test('takes a bare number as either', () => {
    expect(mapRef(' 123 ')).toEqual({ beatmap: 123, set: 123 });
  });

  test('ignores anything else', () => {
    expect(mapRef('cookiezi')).toBeNull();
    expect(mapRef('https://ussr.pl/users/1000')).toBeNull();
  });
});
