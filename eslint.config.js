import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '**/.!*']),

  // Frontend — React + browser globals
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Supabase client uses `as any` throughout — warn until properly typed
      '@typescript-eslint/no-unsafe-assignment':    'warn',
      '@typescript-eslint/no-unsafe-call':          'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument':      'warn',
      '@typescript-eslint/no-unsafe-return':        'warn',

      // 280+ occurrences across codebase — incrementally fix, don't block CI
      '@typescript-eslint/no-floating-promises':    'warn',
      '@typescript-eslint/no-misused-promises':     'warn',

      // Minor — common in Supabase generated types and template literals
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/restrict-template-expressions':  'warn',
      '@typescript-eslint/no-base-to-string':              'warn',

      // LojaPage uses IIFEs for local scoping in JSX
      'react-x/unsupported-syntax': 'warn',

      // Static lists with index keys are acceptable
      'react-x/no-array-index-key': 'warn',

      // react-hooks v7 new rules — pre-existing violations, fix incrementally
      'react-hooks/refs':               'warn',
      'react-hooks/set-state-in-effect':'warn',
      'react-hooks/purity':             'warn',

      '@typescript-eslint/require-await':  'warn',
      '@typescript-eslint/unbound-method': 'warn',
    },
  },

  // Edge Functions — Deno runtime, console.log proibido em produção
  {
    files: ['supabase/functions/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: {
        Deno:             'readonly',
        crypto:           'readonly',
        fetch:            'readonly',
        Request:          'readonly',
        Response:         'readonly',
        URL:              'readonly',
        URLSearchParams:  'readonly',
        Headers:          'readonly',
        FormData:         'readonly',
        ReadableStream:   'readonly',
        WritableStream:   'readonly',
        TextEncoder:      'readonly',
        TextDecoder:      'readonly',
      },
    },
    rules: {
      'no-console': 'error',
    },
  },
])
