import { plugin } from 'bun';
import { resolve } from 'node:path';

// bun test doesn't read svelte.config.js, so mirror the SvelteKit aliases the server code imports.
const serverDir = resolve(import.meta.dir, '../src/server');

plugin({
  name: 'sveltekit-aliases',
  setup(build) {
    build.module('$app/environment', () => ({
      exports: { building: false, dev: false, browser: false },
      loader: 'object'
    }));
    build.module('$env/dynamic/private', () => ({
      exports: { env: process.env },
      loader: 'object'
    }));
    build.onResolve({ filter: /^\$server\// }, (args) => ({
      path: resolve(serverDir, args.path.slice('$server/'.length)) + '.ts'
    }));
  }
});
