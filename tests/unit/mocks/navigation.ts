import { vi } from 'vitest';

export const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };

export const routeParams: { workspaceId?: string; threadId?: string } = {};

export const useRouter = () => router;

export const useParams = () => routeParams;

export const searchParams = new URLSearchParams();

export const useSearchParams = () => searchParams;

export const routePath = { pathname: '/' };

export const usePathname = () => routePath.pathname;
