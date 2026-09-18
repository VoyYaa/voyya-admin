module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier',
  ],
  env: {
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['node_modules', 'dist', 'coverage', '.turbo', '**/*.cjs', '**/*.config.js'],
  rules: {
    // Regla dura del proyecto.
    '@typescript-eslint/no-explicit-any': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/cootrayal|yarumal/i]',
        message:
          'El nombre del tenant llega en SessionUser.tenant (ADR-012 §8.2); no se escribe en el código.',
      },
      {
        selector: 'JSXText[value=/cootrayal|yarumal/i]',
        message:
          'El nombre del tenant llega en SessionUser.tenant (ADR-012 §8.2); no se escribe en el código.',
      },
    ],
  },
};
