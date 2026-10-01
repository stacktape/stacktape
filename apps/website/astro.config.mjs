import react from '@astrojs/react';
import posthog from '@posthog/rollup-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const posthogSourceMapsEnabled = Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID);

export default defineConfig({
  site: 'https://stacktape.com',
  // The README concept became the homepage; the address it was reviewed under keeps working.
  redirects: { '/readme': '/' },
  integrations: [react()],
  vite: {
    plugins: [
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
    // them through the island's own import, and `@stacktape/ui-react` unwraps them whether they
    // arrive pre-bundled or not.
  }
});
