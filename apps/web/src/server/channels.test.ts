import { describe, expect, mock, test } from 'bun:test';
import { Failure } from '$server/respond';
import { Privilege } from '$lib/auth/privileges';
import { parseChat } from '$lib/chat-format';

mock.module('$server/db', () => ({ db: {} }));
mock.module('$server/redis', () => ({ redis: {} }));
mock.module('$server/admin/console', () => ({ record: async () => {} }));

const { byName, channelName, fromPayload, listed, messageContent, moderatedKey, payload } =
  await import('./channels');
const { sendBlock } = await import('./messages');

function code(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error instanceof Failure ? error.code : String(error);
  }
  return null;
}

const row = (name: string, overrides = {}) => ({
  name,
  description: '',
  status: 1,
  public_read: 1,
  public_write: 1,
  auto_join: 1,
  hidden: 0,
  ...overrides
});

describe('listed', () => {
  test('takes open channels everyone joins', () => {
    expect(listed(row('#osu'))).toBe(true);
  });

  test('skips anything not readable, writable, auto-joined, visible and active', () => {
    expect(listed(row('#announce', { public_write: 0 }))).toBe(false);
    expect(listed(row('#ranked', { public_write: 0, auto_join: 0 }))).toBe(false);
    expect(listed(row('#staff', { public_read: 0 }))).toBe(false);
    expect(listed(row('#polish', { auto_join: 0 }))).toBe(false);
    expect(listed(row('#secret', { hidden: 1 }))).toBe(false);
    expect(listed(row('#old', { status: 0 }))).toBe(false);
  });

  test('never lists match, spectator or lobby channels', () => {
    for (const name of ['#spect_1000', '#multi_5', '#multiplayer', '#lazermp_12', '#lobby']) {
      expect(listed(row(name))).toBe(false);
    }
  });

  test('reads flags that come back as bigint or boolean', () => {
    expect(listed(row('#osu', { status: 1n, public_read: true, auto_join: 1n }))).toBe(true);
  });
});

test('#osu sorts first, then by name', () => {
  const sorted = ['#polish', '#osu', '#english']
    .map((name) => ({ name, description: '' }))
    .sort(byName);
  expect(sorted.map((c) => c.name)).toEqual(['#osu', '#english', '#polish']);
});

describe('channelName', () => {
  test('adds the #', () => {
    expect(channelName('osu')).toBe('#osu');
    expect(channelName('#osu')).toBe('#osu');
  });

  test('rejects empty or odd names', () => {
    for (const name of [undefined, '', 'a b', 'a/b', 'a#b', 'x'.repeat(64)]) {
      expect(code(() => channelName(name))).toBe('site.invalid_request');
    }
  });
});

test('the moderation key is the one bancho sets', () => {
  expect(moderatedKey('#osu')).toBe('rosu:chat_moderated:#osu');
});

describe('messageContent', () => {
  test('trims', () => {
    expect(messageContent('  hi  ')).toBe('hi');
  });

  test('rejects empty, too long or not text', () => {
    for (const raw of ['', '   ', 'x'.repeat(1001), 5, null, undefined]) {
      expect(code(() => messageContent(raw))).toBe('site.invalid_request');
    }
    expect(messageContent('x'.repeat(1000))).toHaveLength(1000);
  });

  test('rejects commands', () => {
    expect(code(() => messageContent(' !roll'))).toBe('site.channel_no_commands');
  });
});

describe('sendBlock', () => {
  const player = Privilege.Public | Privilege.Normal;

  test('lets normal players send', () => {
    expect(sendBlock(player, 0, 100)).toBeNull();
  });

  test('blocks banned, restricted and silenced players', () => {
    expect(sendBlock(Privilege.Public, 0, 100)).toBe('site.forbidden');
    expect(sendBlock(Privilege.Normal, 0, 100)).toBe('site.messages_restricted');
    expect(sendBlock(player, 200, 100)).toBe('site.messages_silenced');
  });
});

test('payload marks staff as admin', () => {
  const sender = { id: 1000, username: 'Aochi', privileges: Privilege.Public };
  expect(payload(5, '#osu', sender, 'hi')).toEqual({
    id: 5,
    source: 'web',
    channel: '#osu',
    sender_id: 1000,
    sender_name: 'Aochi',
    content: 'hi',
    admin: false
  });
  for (const bit of [Privilege.AdminManageUsers, Privilege.AdminManageServer]) {
    expect(payload(5, '#osu', { ...sender, privileges: bit | 1 }, 'hi').admin).toBe(true);
  }
  expect(payload(5, '#osu', { ...sender, privileges: Privilege.AdminChatMod }, 'hi').admin).toBe(
    false
  );
});

describe('fromPayload', () => {
  const now = new Date('2026-10-08T12:00:00Z');

  test('turns a published message into what the page shows', () => {
    const raw = JSON.stringify({
      id: 7,
      source: 'bancho',
      channel: '#osu',
      sender_id: 1000,
      sender_name: 'Aochi',
      content: 'hi',
      admin: false
    });
    expect(fromPayload(raw, now)).toEqual({
      channel: '#osu',
      message: {
        id: 7,
        sender: { id: 1000, username: 'Aochi' },
        content: 'hi',
        time: '2026-10-08T12:00:00.000Z'
      }
    });
  });

  test('keeps /me as a CTCP action the page renders as one', () => {
    const raw = JSON.stringify({
      id: 8,
      channel: '#osu',
      sender_id: 1000,
      sender_name: 'Aochi',
      content: '\x01ACTION is playing Blue Zenith\x01'
    });
    const chat = parseChat(fromPayload(raw, now)!.message.content);
    expect(chat.action).toBe(true);
    expect(chat.parts).toEqual([{ text: 'is playing Blue Zenith' }]);
  });

  test('ignores junk', () => {
    expect(fromPayload('nope', now)).toBeNull();
    expect(fromPayload('null', now)).toBeNull();
    expect(fromPayload(JSON.stringify({ channel: '#osu', content: 'hi' }), now)).toBeNull();
  });
});
