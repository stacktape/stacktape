import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./e2e/gallery', import.meta.url)),
  publicDir: false,
  // This gallery has synthetic data only. Never expose a developer's VITE_* settings or load .env files.
  envDir: false,
  envPrefix: [],
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: true,
    fs: {
      allow: [
        fileURLToPath(new URL('./', import.meta.url)),
        fileURLToPath(new URL('../design-tokens', import.meta.url))
      ]
    }
  }
});
