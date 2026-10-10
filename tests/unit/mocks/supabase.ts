import { vi } from 'vitest';

export const createClient = vi.fn();

export const NO_ROW_ERROR = { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' };

export const primeSupabase = (
  results: Array<{ data?: unknown; error?: unknown; count?: number }>,
  options?: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null },
) => {
  const queries = results.map((result) => {
    const resolve = async () => ({
      data: result.data ?? null,
      error: result.error ?? null,
      count: result.count ?? null,
    });

    const query = {
      select: () => query,
      in: () => query,
      eq: () => query,
      neq: () => query,
      is: () => query,
      order: () => query,
      limit: () => query,
      range: () => query,
      returns: resolve,
      maybeSingle: resolve,
      single: resolve,
      then: (
        onFulfilled?: (value: Awaited<ReturnType<typeof resolve>>) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => resolve().then(onFulfilled, onRejected),
      upsert: vi.fn(resolve),
      insert: vi.fn(() => query),
      update: vi.fn(() => query),
      delete: vi.fn(() => query),
    };

    return query;
  });

  let nextQueryIndex = 0;

  const client = {
    from: vi.fn(() => queries[Math.min(nextQueryIndex++, queries.length - 1)]),
    rpc: vi.fn(
      async (_name: string, _params?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> => ({
        data: null,
        error: null,
      }),
    ),
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options ? options.user : { id: 'user-1' } },
        error: null,
      })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      verifyOtp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  };

  vi.mocked(createClient).mockReturnValue(client as never);

  return { client, queries };
};
