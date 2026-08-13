import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The wizard is embedded in the CLI, not hosted.
 *
 * That decides most of this file. Assets are referenced relatively because the page is served from a
 * localhost origin whose port changes every run; nothing is split into async chunks the browser
 * would have to fetch separately, because the whole point is that it works offline and on a locked
 * down network; and the output lands where the CLI build copies it from.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    // `@stacktape/ui-react` is consumed as source and declares React as a peer, so without this the
    // bundle can end up with two copies — and a hook called against the second one finds a null
    // dispatcher, which surfaces as "Cannot read properties of null (reading 'useRef')".
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // A handful of files rather than a graph of them: this bundle is read off local disk over
    // loopback, so there is nothing to gain from splitting it and a strict CSP to satisfy.
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
