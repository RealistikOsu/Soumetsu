/**
 * Soumetsu Vue App Factory
 *
 * Creates Vue apps with custom delimiters ([[ ]]) to avoid conflicts
 * with Go's html/template which uses {{ }}.
 *
 * Usage:
 *   const app = Soumetsu.createApp({ data() { ... }, methods: { ... } });
 *   app.mount('#my-app');
 */
const Soumetsu = {
    delimiters: ['[[', ']]'],

    /**
     * Create a Vue app with custom delimiters pre-configured.
     * @param {Object} options - Vue component options (data, methods, computed, etc.)
     * @returns {Object} Vue app instance ready to mount
     */
    createApp(options) {
        // Set delimiters at top level (Vue 2 compatibility) AND in compilerOptions (Vue 3)
        options.delimiters = Soumetsu.delimiters;
        options.compilerOptions = options.compilerOptions || {};
        options.compilerOptions.delimiters = Soumetsu.delimiters;

        const app = Vue.createApp(options);

        // Also set at app config level for good measure
        if (app.config.compilerOptions) {
            app.config.compilerOptions.delimiters = Soumetsu.delimiters;
        }

        return app;
    }
};

window.Soumetsu = Soumetsu;
