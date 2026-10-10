import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import storybook from 'eslint-plugin-storybook';

import { importRestrictionRules, importStructureRules } from './eslint/imports.mjs';
import {
  declarationFilesOverride,
  e2eFixturesOverride,
  storybookOverride,
  useTranslationsWrapperOverride,
} from './eslint/overrides.mjs';
import { codeStyleRules, reactRules } from './eslint/style.mjs';
import { testConventionRules } from './eslint/tests.mjs';
import { typescriptRules } from './eslint/typescript.mjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...storybook.configs['flat/recommended'],

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'storybook-static/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
    'node_modules/**',
    '.idea/**',
    '.husky/_/**',
    '.vercel/**',
    '.env*',
    'supabase/.branches/**',
    'supabase/.temp/**',
    'supabase/migrations/**',
  ]),

  codeStyleRules,
  reactRules,
  importStructureRules,
  importRestrictionRules,
  typescriptRules,
  testConventionRules,

  storybookOverride,
  declarationFilesOverride,
  e2eFixturesOverride,
  useTranslationsWrapperOverride,
]);
