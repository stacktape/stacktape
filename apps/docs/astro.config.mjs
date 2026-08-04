import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import posthog from '@posthog/rollup-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { apiReferenceDataPlugin } from './src/build/api-reference-data.ts';
import { REPO_ROOT } from './src/build/cli-generated-inputs.ts';
import { generatedRuntimeAssets } from './src/build/generated-runtime-assets.ts';
import { getGitLastModified } from './src/utils/git-dates.ts';
import { rehypeDocsLinks } from './src/utils/rehype-docs-links.ts';
import { remarkCodeToComponent } from './src/utils/remark-code-to-component.ts';
import { remarkDocsTransforms } from './src/utils/remark-docs-transforms.ts';
import { remarkFixJsxTemplateIndent } from './src/utils/remark-fix-jsx-template-indent.ts';

const SITE_URL = 'https://docs.stacktape.com';
const posthogSourceMapsEnabled = Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID);
const posthogSourceMapPlugin = posthogSourceMapsEnabled
  ? posthog({
      personalApiKey: process.env.POSTHOG_API_KEY,
      projectId: process.env.POSTHOG_PROJECT_ID,
      host: process.env.POSTHOG_HOST || 'https://eu.posthog.com',
      sourcemaps: {
        releaseName: 'stacktape-docs',
        releaseVersion: process.env.POSTHOG_RELEASE_VERSION || 'local',
        deleteAfterUpload: true
      }
    })
  : null;

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  markdown: {
    // Our own <CodeBlock> island handles syntax highlighting (Shiki + Twoslash in the browser), so
    // Astro's compile-time Shiki is disabled. Smartquotes would corrupt code and inline text.
    // Astro 7 replaced `markdown.{remarkPlugins,rehypePlugins,gfm,smartypants}` with a single
    // `processor` built via `unified({...})`; the MDX integration inherits the processor's plugins,
    // so these still apply to every `.mdx` page.
    syntaxHighlight: false,
    processor: unified({
      gfm: true,
      smartypants: false,
      // Astro auto-injects heading ids and collects `headings` (used for the TOC), so no
      // slug/autolink plugins are needed. remark order matters: fix-jsx-template-indent (restores
      // verbatim code in `<CodeBlock tabs>` template literals, undoing MDX's multi-line dedent) →
      // docs transforms → code-to-component (last, so it converts every resulting code node).
      remarkPlugins: [remarkFixJsxTemplateIndent, remarkDocsTransforms, remarkCodeToComponent],
      rehypePlugins: [rehypeDocsLinks]
    })
  },
  integrations: [
    react(),
    mdx(),
    generatedRuntimeAssets(),
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const sourcePath = pathname === '/' ? 'content/index.mdx' : `content${pathname.replace(/\/$/, '')}.mdx`;
        const lastModified = getGitLastModified(sourcePath);
        return lastModified ? { ...item, lastmod: new Date(lastModified) } : item;
      }
    })
  ],
  vite: {
    plugins: [apiReferenceDataPlugin(), tailwindcss(), ...(posthogSourceMapPlugin ? [posthogSourceMapPlugin] : [])],
    resolve: {
      // Force a single React copy. Without this, a mid-session dep re-optimization can momentarily
      // resolve a second React instance for some islands → "Invalid hook call / more than one copy
      // of React" during SSR.
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
    },
    optimizeDeps: {
      // Pre-bundle the heavy code-highlighting deps at server start so Vite does NOT re-optimize
      // mid-session. A mid-session re-optimization changes the `?v=` hash and 404s Shiki's
      // already-resolved grammar URLs in `.vite/deps` ("Failed to fetch dynamically imported
      // module" → yaml/json highlighting breaks after a tab switch). The CodeBlock also preloads
      // every grammar up front (see SHIKI_LANGS) so none are fetched lazily after that point.
      include: ['shiki', '@shikijs/twoslash', 'twoslash', 'typescript']
    },
    server: {
      // `src/utils/starter-projects.ts` reads generated metadata from `apps/cli`.
      fs: { allow: [REPO_ROOT] }
    }
  }
});
