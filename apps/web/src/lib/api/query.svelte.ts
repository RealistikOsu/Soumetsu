export type QueryState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: unknown };

export function query<T>(load: (signal: AbortSignal) => Promise<T>) {
  let state = $state.raw<QueryState<T>>({ status: 'loading' });

  $effect(() => {
    const controller = new AbortController();
    state = { status: 'loading' };
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) state = { status: 'ready', data };
      },
      (error) => {
        if (!controller.signal.aborted) state = { status: 'error', error };
      }
    );
    return () => controller.abort();
  });

  return {
    get state() {
      return state;
    }
  };
}
