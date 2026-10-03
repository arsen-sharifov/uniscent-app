import { vi } from 'vitest';

export const primeFetch = (status: number, body?: unknown) => {
  const fetchSpy = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

  vi.stubGlobal('fetch', fetchSpy);

  return fetchSpy;
};
