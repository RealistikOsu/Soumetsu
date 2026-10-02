import js from '@eslint/js';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';

export default ts.config(
  { ignores: ['**/build/', '**/.svelte-kit/', '**/node_modules/', '**/src/lib/paraglide/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      semi: ['error', 'always'],
      'svelte/no-navigation-without-resolve': 'off',
      // Every {@html} goes through lib/sanitise first.
      'svelte/no-at-html-tags': 'off',
      // False positives on $bindable props.
      'no-useless-assignment': 'off'
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: ts.parser }
    }
  }
);
