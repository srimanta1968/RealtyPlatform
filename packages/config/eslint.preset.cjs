/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'boundaries'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: { alwaysTryTypes: true },
    },
    'boundaries/elements': [
      { type: 'app', pattern: 'apps/*' },
      { type: 'bff', pattern: 'bffs/*' },
      { type: 'service', pattern: 'services/*' },
      { type: 'agent', pattern: 'agents/*' },
      { type: 'workflow', pattern: 'workflows/*' },
      { type: 'package', pattern: 'packages/*' },
    ],
  },
  rules: {
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'boundaries/element-types': [
      'error',
      {
        default: 'allow',
        rules: [
          { from: 'service', disallow: ['app'] },
          { from: 'service', disallow: [{ type: 'package', pattern: 'sdk' }] },
          { from: 'app', disallow: ['service', 'agent', 'workflow'] },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', '.next', '.turbo', 'node_modules', 'coverage'],
};
