import { defineConfig, type Plugin } from 'vite';
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
/**
 * Makes the diagram's icon packs load under the rolldown-based Vite this bundle is built with.
 *
 * `@isoflow/isopacks` ships CommonJS whose `module.exports` carries `__esModule` and a `default`.
 * Because `@stacktape/ui-react` is an ES module package, the bundler hands its default import the
 * whole `module.exports` rather than that `default`, and `resource-icon/isopack.js` — which reads
 * `awsIsopack.icons` — throws "icons is not iterable" the moment the diagram chunk loads. Nothing
 * catches it, so the Review step and everything after it disappear.
 *
 * The same unwrap the website applies for the same reason, at the consumer that has the problem. The
 * `?? pack` fallback keeps it correct under either interop, and it stops applying by itself if the
 * package ever unwraps the packs.
 */
const isopackInterop: Plugin = {
  name: 'stacktape-init-ui:isopack-interop',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('resource-icon/isopack')) return null;

    const patched = code
      .replaceAll('awsIsopack.icons', '(awsIsopack.default ?? awsIsopack).icons')
      .replaceAll('isoflowIsopack.icons', '(isoflowIsopack.default ?? isoflowIsopack).icons');

    return patched === code ? null : { code: patched, map: null };
  }
};

export default defineConfig({
  plugins: [isopackInterop, react(), tailwindcss()],
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
