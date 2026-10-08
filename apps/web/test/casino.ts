import { mock } from 'bun:test';

type User = { coins: number; privileges: bigint } | null;

// Getters, so a test can swap its own variables in beforeEach and the fakes follow.
interface Store {
  config: () => object | null;
  user: () => User;
  updates: () => unknown[][];
  history: () => Record<string, unknown>[];
  keys: () => Record<string, string>;
  incr?: () => number;
  // Runs inside get and getdel, to stand in for a request landing in between.
  onGet?: (key: string) => void;
  onGetdel?: (key: string) => void;
}

// The db and redis a stateful game's session touches, kept in memory.
export function mockCasinoStore(store: Store) {
  // Like a real transaction, writes land only once the callback resolves.
  const transaction = () => {
    const updates: unknown[][] = [];
    const history: Record<string, unknown>[] = [];
    const client = {
      $queryRaw: async () => {
        const user = store.user();
        return user ? [user] : [];
      },
      $executeRaw: async (_sql: TemplateStringsArray, ...values: unknown[]) => {
        updates.push(values);
        return 1;
      },
      casino_game_history: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          history.push(data);
          return data;
        }
      }
    };
    const commit = () => {
      store.updates().push(...updates);
      store.history().push(...history);
    };
    return { client, commit };
  };

  mock.module('$server/db', () => ({
    db: {
      casino_game_config: { findUnique: async () => store.config() },
      $transaction: async <T>(
        fn: (client: ReturnType<typeof transaction>['client']) => Promise<T>
      ) => {
        const { client, commit } = transaction();
        const result = await fn(client);
        commit();
        return result;
      }
    }
  }));

  mock.module('$server/redis', () => ({
    redis: {
      incr: async () => store.incr?.() ?? 1,
      get: async (key: string) => {
        const value = store.keys()[key] ?? null;
        store.onGet?.(key);
        return value;
      },
      getdel: async (key: string) => {
        store.onGetdel?.(key);
        const keys = store.keys();
        const value = keys[key] ?? null;
        delete keys[key];
        return value;
      },
      del: async (key: string) => {
        const keys = store.keys();
        const had = key in keys;
        delete keys[key];
        return had ? 1 : 0;
      },
      set: async (key: string, value: string, ...args: (string | number)[]) => {
        const keys = store.keys();
        if (args.includes('NX') && key in keys) return null;
        if (args.includes('XX') && !(key in keys)) return null;
        keys[key] = value;
        return 'OK';
      },
      // Compare-and-delete with two arguments, compare-and-set with three.
      eval: async (_script: string, _n: number, key: string, from: string, to?: string) => {
        const keys = store.keys();
        if (keys[key] !== from) return 0;
        if (to === undefined) delete keys[key];
        else keys[key] = to;
        return 1;
      }
    }
  }));
}
