import { EMAIL_PATTERN, EMAIL_TEXT_UNSAFE_PATTERN, MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from '@constants';

export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();

  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email) ? email : null;
};

export const toEmailText = (value: string): string => {
  const text = value.replaceAll(/\s+/g, ' ').replaceAll(EMAIL_TEXT_UNSAFE_PATTERN, '').trim();

  return Array.from(text).slice(0, MAX_NAME_LENGTH).join('');
};
