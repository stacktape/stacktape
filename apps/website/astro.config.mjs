import react from '@astrojs/react';
import posthog from '@posthog/rollup-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const posthogSourceMapsEnabled = Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID);

/**
 * Makes the isometric diagram's icon packs load under Astro's bundler.
 *
 * `@isoflow/isopacks` ships CommonJS whose `module.exports` is a synthetic namespace carrying
 * `__esModule` and a `default`. Bundlers that honour that flag hand a default import the icon table;
 * the rolldown-based Vite that Astro 7 uses hands it the namespace instead, and
 * `packages/ui-react/.../resource-icon/isopack.js` — which does `awsIsopack.icons` — then throws
 * "icons is not iterable" the moment the diagram island hydrates. Console and the init wizard build
 * on plain Vite and never see it, which is why the package itself is not wrong.
 *
 * So the unwrap happens here, at the consumer that has the problem, in the one file that has it. The
 * `?? pack` fallback means this keeps working under either interop, and it silently stops applying
 * if `@stacktape/ui-react` ever unwraps the packs itself.
 */
const isopackInterop = {
  name: 'stacktape-website:isopack-interop',
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
  site: 'https://stacktape.com',
  integrations: [react()],
  vite: {
    plugins: [
      isopackInterop,
      tailwindcss(),
      ...(posthogSourceMapsEnabled
        ? [
            posthog({
              personalApiKey: process.env.POSTHOG_API_KEY,
              projectId: process.env.POSTHOG_PROJECT_ID,
              host: process.env.POSTHOG_HOST || 'https://eu.posthog.com',
              sourcemaps: {
                releaseName: 'stacktape-website',
                releaseVersion: process.env.POSTHOG_RELEASE_VERSION || 'local',
                deleteAfterUpload: true
              }
            })
          ]
        : [])
    ],
    resolve: {
      // Force a single React copy. Without this, a mid-session dep re-optimization can momentarily
      // resolve a second React instance for some islands, which surfaces during SSR as
      // "Cannot read properties of null (reading 'useRef')" / "Invalid hook call".
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
    }
    //
    // There is deliberately no `optimizeDeps` block, for two separate reasons.
    //
    // Unlike the docs site there is no client-side Shiki here: every snippet is highlighted in
    // `.astro` frontmatter (src/lib/snippets), so shiki, `yaml`, `marked` and the config schema stay
    // out of the browser graph entirely and need no pinning.
    //
    // And the diagram's icon packs are not pinned either, tempting as it is: they belong to
    // `@stacktape/ui-react` rather than to this app, so under pnpm they are not resolvable from this
    // package root and naming them only produces "Failed to resolve dependency" warnings. Vite finds
    // them through the island's own import, and `isopackInterop` above is what makes them work
    // whether they arrive pre-bundled or not.
  }
});
