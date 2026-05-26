import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // Frontend — React + browser globals
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
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
