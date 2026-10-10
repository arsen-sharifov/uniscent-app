import { existsSync, readFileSync } from 'node:fs';

import { E2E_MAILPIT_URL } from '../consts';
import type { IE2ESupabaseEnv } from '../interfaces';

const ENV_FILES = ['.env.local', '.env'];

const QUOTES_PATTERN = /^['"]|['"]$/g;

let loaded = false;

const parseEnvFile = (content: string): Record<string, string> =>
  content.split(/\r?\n/).reduce<Record<string, string>>((values, line) => {
    const trimmed = line.trim();
    const separator = trimmed.indexOf('=');

    if (trimmed.length === 0 || trimmed.startsWith('#') || separator < 1) return values;

    return {
      ...values,
      [trimmed.slice(0, separator).trim()]: trimmed
        .slice(separator + 1)
        .trim()
        .replace(QUOTES_PATTERN, ''),
    };
  }, {});

const loadEnvFiles = () => {
  if (loaded) return;
  loaded = true;

  ENV_FILES.filter((file) => existsSync(file)).forEach((file) => {
    Object.entries(parseEnvFile(readFileSync(file, 'utf8'))).forEach(([key, value]) => {
      if (process.env[key] === undefined) process.env[key] = value;
    });
  });
};

const requireEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is missing. Fill it in .env.local (local runs) or in the workflow env (CI).`);
  }

  return value;
};

export const getSupabaseEnv = (): IE2ESupabaseEnv => {
  loadEnvFiles();

  return {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
};

export const getInviteCode = (): string => {
  loadEnvFiles();

  return requireEnv('INVITE_CODE');
};

export const getAppUrl = (): string => {
  loadEnvFiles();

  return requireEnv('NEXT_PUBLIC_APP_URL');
};

export const getMailpitUrl = (): string => {
  loadEnvFiles();

  return process.env.MAILPIT_URL ?? E2E_MAILPIT_URL;
};
