import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Use happy-dom for DOM emulation
        environment: 'happy-dom',

        // Test file patterns
        include: ['web/static/**/*.test.js', 'web/static/**/*.spec.js'],

        // Global setup
        globals: true,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['web/static/**/*.js'],
            exclude: [
                'web/static/vue/vue.js',
                'web/static/vue/vue-axios.js',
                'web/static/dist.min.js',
                '**/*.test.js',
                '**/*.spec.js',
            ],
        },

        // Setup files
        setupFiles: ['./web/static/test-setup.js'],
    },
});
