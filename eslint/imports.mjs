import { SOURCE_FILES } from './consts.mjs';

const restrictedImportPaths = [
  {
    name: 'react',
    importNames: ['default'],
    message: 'Use named imports from `react`.',
  },
  {
    name: 'next-intl',
    importNames: ['useMessages', 'useTranslations'],
    message:
      'Use `useTranslations` from `@/i18n`: it returns the typed `TTranslations` object and a typed translator, so call `t(key, params)` for interpolation and plurals.',
  },
];

const restrictedImportPatterns = [
  {
    group: ['../**/lib/**', '../**/api/**'],
    message:
      'Use the matching alias (`@interfaces`, `@constants`, `@hooks`, `@api`, or `@/lib/...`) instead of a relative path.',
  },
  {
    group: ['@/lib/interfaces/**'],
    message: 'Import via the `@interfaces` barrel.',
  },
  {
    group: ['@/lib/constants/**'],
    message: 'Import via the `@constants` barrel.',
  },
  {
    group: ['@/lib/hooks/**'],
    message: 'Import via the `@hooks` barrel.',
  },
  {
    group: ['@/api/**'],
    message: 'Import via the `@api` barrel.',
  },
];

export const importStructureRules = {
  files: SOURCE_FILES,
  rules: {
    'import/no-duplicates': 'error',
    'import/no-namespace': 'error',
    'import/no-cycle': ['error', { maxDepth: 3, ignoreExternal: true }],
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': ['error', { noUselessIndex: true }],
    'import/newline-after-import': ['error', { count: 1 }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          { pattern: '@interfaces', group: 'internal', position: 'before' },
          { pattern: '@interfaces/**', group: 'internal', position: 'before' },
          { pattern: '@constants', group: 'internal', position: 'before' },
          { pattern: '@constants/**', group: 'internal', position: 'before' },
          { pattern: '@hooks', group: 'internal', position: 'before' },
          { pattern: '@hooks/**', group: 'internal', position: 'before' },
          { pattern: '@api', group: 'internal', position: 'before' },
          { pattern: '@api/**', group: 'internal', position: 'before' },
          { pattern: '@story-interfaces', group: 'internal', position: 'before' },
          { pattern: '@story-interfaces/**', group: 'internal', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'after' },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        distinctGroup: false,
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
};

export const importRestrictionRules = {
  files: SOURCE_FILES,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: restrictedImportPaths,
        patterns: restrictedImportPatterns,
      },
    ],
  },
};
