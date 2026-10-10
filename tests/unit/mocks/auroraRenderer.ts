import { vi } from 'vitest';

export const createAuroraRenderer = vi.fn();
export const draw = vi.fn();

export const renderer = { draw, resize: vi.fn() };
