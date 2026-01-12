module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:security/recommended-legacy',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['vue', 'security'],
  globals: {
    // Vue and related globals
    Vue: 'readonly',
    axios: 'readonly',
    // Application globals
    SoumetsuAPI: 'readonly',
    soumetsuConf: 'readonly',
    // jQuery
    $: 'readonly',
    jQuery: 'readonly',
    // i18next
    i18next: 'readonly',
    // timeago
    timeago: 'readonly',
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',

    // Security rules - critical for XSS prevention
    'vue/no-v-html': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-eval-with-expression': 'error',

    // Vue 3 specific rules (strict mode)
    'vue/multi-word-component-names': 'off', // Allow single-word names for legacy compat
    'vue/no-mutating-props': 'error',
    'vue/no-setup-props-destructure': 'error',
    'vue/require-default-prop': 'warn',
    'vue/require-prop-types': 'warn',

    // Code quality
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-implicit-globals': 'error',

    // Style (handled by Prettier, but some logical rules)
    'curly': ['error', 'all'],
    'no-else-return': 'error',
  },
  overrides: [
    {
      // Relaxed rules for legacy files during migration
      files: ['web/static/vue/pages/*.js', 'web/static/js/*.js'],
      rules: {
        'no-var': 'warn', // Downgrade to warning for legacy code
        'prefer-const': 'warn',
        'vue/no-v-html': 'warn', // Warn during migration, will fix in Phase 2
      },
    },
    {
      // Template files with inline scripts
      files: ['web/templates/**/*.html'],
      rules: {
        'no-undef': 'off', // Templates may reference server-side variables
      },
    },
  ],
};
