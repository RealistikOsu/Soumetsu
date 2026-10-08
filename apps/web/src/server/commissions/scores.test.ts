import { describe, expect, test } from 'bun:test';
import { normaliseLazer, normaliseStable, type LazerRow, type StableRow } from './scores';

const map = {
  beatmapset_id: 10,
  difficulty_std: 5.5,
  difficulty_taiko: 0,
  difficulty_ctb: 0,
  difficulty_mania: 0,
  bpm: 180,
  hit_length: 200,
  ar: 9.3,
  od: 8,
  max_combo: 1200,
  diff_name: 'Extra',
  song_name: "Camellia - Exit This Earth's Atomosphere [Extra]",
  ranked: 2,
  mapper_id: -1,
  mode: 0,
  latest_update: 0
};

describe('normaliseStable', () => {
  const row: StableRow = {
    ...map,
    id: 1,
    variant: 1,
    beatmap_id: 5,
    beatmap_md5: 'abc',
    score: 1000,
    max_combo: 400,
    full_combo: 1,
    mods: 72,
    count_300: 300,
    count_100: 10,
    count_50: 0,
    count_misses: 0,
    time: '1791420000',
    play_mode: 0,
    completed: 3,
    accuracy: 98.5,
    pp: 250,
    playback_rate: 1.5
  };
  test('reads mods as acronyms and the rate', () => {
    const score = normaliseStable(row);
    expect(score.mods).toEqual(['HD', 'DT']);
    expect(score.rate).toBe(1.5);
    expect(score.source).toBe('stable');
    expect(score.variant).toBe(1);
    expect(score.isBest).toBe(true);
    expect(score.grade).toBe('SH');
    expect(score.map.stars).toBe(5.5);
    expect(score.map.artist).toBe('Camellia');
    expect(score.at.toISOString()).toBe('2026-10-08T00:40:00.000Z');
  });
  test('a failed play is not passed', () => {
    expect(normaliseStable({ ...row, completed: 0 }).passed).toBe(false);
  });
});

describe('normaliseLazer', () => {
  const row: LazerRow = {
    ...map,
    id: 2,
    variant: 0,
    beatmap_id: 5,
    beatmap_md5: 'abc',
    ruleset_id: 0,
    ranked_mods: 1,
    mods: '[{"acronym":"CL","settings":null},{"acronym":"DT","settings":{"speed_change":1.3}}]',
    statistics: '{"great":300,"ok":10,"meh":0,"miss":1}',
    total_score: 900000,
    accuracy: 0.975,
    max_combo: 350,
    rank: 'A',
    passed: 1,
    pp: 210.4,
    ended_at: new Date('2026-10-08T01:00:00Z')
  };
  test('drops CL, reads the rate from settings and counts from statistics', () => {
    const score = normaliseLazer(row);
    expect(score.mods).toEqual(['DT']);
    expect(score.rate).toBe(1.3);
    expect(score.accuracy).toBe(97.5);
    expect(score.misses).toBe(1);
    expect(score.c300).toBe(300);
    expect(score.grade).toBe('A');
    expect(score.source).toBe('lazer');
  });
});
