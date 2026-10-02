import type { RequestHandler } from '@sveltejs/kit';
import { record } from './admin/console';

export class Failure extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
  }
}

const json = (status: number, data: unknown) =>
  new Response(
    JSON.stringify({ status, data }, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );

export const ok = (data: unknown = null) => json(200, data);

export const fail = (status: number, code: string) => json(status, code);

// Wraps a handler so a thrown Failure becomes the same { status, data } envelope the API uses.
export const handle =
  (handler: RequestHandler): RequestHandler =>
  async (event) => {
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof Failure) return fail(error.status, error.code);
      await record('error', null, error);
      throw error;
    }
  };
