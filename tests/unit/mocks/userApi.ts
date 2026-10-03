import { vi } from 'vitest';

export const addUserBadge = vi.fn();
export const deleteAccount = vi.fn();
export const getPreferences = vi.fn();
export const getUser = vi.fn();
export const signOut = vi.fn();
export const updateEmail = vi.fn();
export const updatePassword = vi.fn();
export const updateUserMetadata = vi.fn();
export const upsertPreferences = vi.fn();

export const USER_UNAVAILABLE = { data: { user: null }, error: null };
