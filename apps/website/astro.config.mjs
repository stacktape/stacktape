import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { websitePublication } from './src/build/publish.mjs';

const deployStage = process.env.STACKTAPE_WEBSITE_STAGE;

export default defineConfig({
  site: 'https://stacktape.com',
  // The README concept became the homepage; the address it was reviewed under keeps working. The benchmark page was
  // removed (owner, 25 Nov 2026): its figures link to the public benchmark repository instead.
  redirects: { '/readme': '/', '/benchmarks': '/' },
  integrations: [react(), ...(deployStage ? [websitePublication(deployStage)] : [])],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // `@stacktape/ui-react/resource-icon` draws the AWS icons from `aws-react-icons`, whose ESM index imports its
      // files without extensions. Node cannot load that when the dev server leaves the package external, so the server
      // render failed with "Cannot find module .../aws-react-icons/lib/icons/…". Vite bundles it instead.
      noExternal: ['aws-react-icons'],
      // Its ESM index re-exports CommonJS files, so it is pre-bundled into real ESM first. Named through
      // `@stacktape/ui-react`, the package that depends on it, because pnpm does not link it into this app.
      optimizeDeps: { include: ['@stacktape/ui-react > aws-react-icons'] }
    },
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
