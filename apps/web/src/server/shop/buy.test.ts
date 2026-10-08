import { describe, expect, test } from 'bun:test';
import { Failure } from '$server/respond';
import { parseUsername, parseWipe } from './buy';

function code(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error instanceof Failure ? error.code : String(error);
  }
  return null;
}

describe('parseWipe', () => {
  test('takes one mode and variant', () => {
    expect(parseWipe({ mode: 2, variant: 'rx' })).toEqual({ modes: [2], types: ['rx'] });
  });

  test("'all' expands", () => {
    expect(parseWipe({ mode: 'all', variant: 'all' })).toEqual({
      modes: [0, 1, 2, 3],
      types: ['va', 'rx', 'ap']
    });
  });

  test('lazer is not for sale', () => {
    expect(code(() => parseWipe({ mode: 0, variant: 'lz' }))).toBe('site.invalid_request');
  });

  test('rejects a bad mode', () => {
    for (const mode of [4, -1, 1.5, '0', null, undefined]) {
      expect(code(() => parseWipe({ mode, variant: 'va' }))).toBe('site.invalid_request');
    }
  });

  test('rejects a missing variant', () => {
    expect(code(() => parseWipe({ mode: 0 }))).toBe('site.invalid_request');
  });
});

describe('parseUsername', () => {
  test('accepts the casino charset', () => {
    expect(parseUsername({ new_username: 'Aochi' })).toBe('Aochi');
    expect(parseUsername({ new_username: '[RO] cool-guy' })).toBe('[RO] cool-guy');
    expect(parseUsername({ new_username: 'under_score' })).toBe('under_score');
  });

  test('trims the edges', () => {
    expect(parseUsername({ new_username: '  Aochi ' })).toBe('Aochi');
  });

  test('rejects lengths outside 2 to 15', () => {
    expect(code(() => parseUsername({ new_username: 'a' }))).toBe('shop.username_invalid');
    expect(code(() => parseUsername({ new_username: 'a'.repeat(16) }))).toBe(
      'shop.username_invalid'
    );
  });

  test('rejects other characters', () => {
    for (const name of ['nope!', 'żółw', 'a.b', 'tab\there']) {
      expect(code(() => parseUsername({ new_username: name }))).toBe('shop.username_invalid');
    }
  });

  test('rejects an underscore and a space together', () => {
    expect(code(() => parseUsername({ new_username: 'a_b c' }))).toBe('shop.username_invalid');
  });

  test('rejects a missing name', () => {
    expect(code(() => parseUsername({}))).toBe('shop.username_invalid');
    expect(code(() => parseUsername({ new_username: 42 }))).toBe('shop.username_invalid');
  });
});
