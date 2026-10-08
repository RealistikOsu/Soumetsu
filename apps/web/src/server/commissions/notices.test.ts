import { describe, expect, test } from 'bun:test';
import { noticeLines } from './notices';

describe('noticeLines', () => {
  test('one line per finished task and per tier ready to claim', () => {
    const lines = noticeLines(
      [{ template: 'login', params: {}, points: 30 }],
      [{ coins: 50 }],
      130,
      300,
      'https://ussr.pl/commissions'
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEndWith('(+30 pts, 130/300 today)');
    expect(lines[1]).toBe(
      '50 coins are ready to claim. [https://ussr.pl/commissions Claim them here]'
    );
  });
});
