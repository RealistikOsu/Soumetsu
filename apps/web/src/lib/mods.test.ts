import { describe, expect, test } from 'bun:test';
import { modsText } from './mods';

describe('modsText', () => {
  test('shows DT with pitch adjustment as NC', () => {
    const mods = [
      { acronym: 'CL', settings: null },
      { acronym: 'DT', settings: { speed_change: 1.5, adjust_pitch: true } }
    ];

    expect(modsText(mods)).toBe('+NC');
  });

  test('keeps plain DT as DT', () => {
    const mods = [{ acronym: 'DT', settings: { speed_change: 1.5, adjust_pitch: false } }];

    expect(modsText(mods)).toBe('+DT');
  });

  test('keeps a custom rate on the shown mod', () => {
    const mods = [{ acronym: 'DT', settings: { speed_change: 1.35, adjust_pitch: true } }];

    expect(modsText(mods)).toBe('+NC(1.35x)');
  });
});
