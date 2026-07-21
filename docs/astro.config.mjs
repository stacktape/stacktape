import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import { join } from 'node:path';
import { cpSync, existsSync } from 'node:fs';

import { unified } from '@astrojs/markdown-remark';
import { remarkDocsTransforms } from './src/utils/remark-docs-transforms.ts';
import { remarkCodeToComponent } from './src/utils/remark-code-to-component.ts';
import { remarkFixJsxTemplateIndent } from './src/utils/remark-fix-jsx-template-indent.ts';
import { rehypeDocsLinks } from './src/utils/rehype-docs-links.ts';
import { getGitLastModified } from './src/utils/git-dates.ts';

// Mirror the content static dir (the docs/docs/static content tree) into public/static so MDX
// images referenced as `/static/...` resolve. cwd is the docs/ project root, so this is
// `<docs>/docs/static` — exactly what the old next.config copied. Keeps the authoring workflow
// intact (drop an image in docs/docs/static, reference it as /static/...).
const contentStaticDir = join(process.cwd(), 'docs', 'static');
const publicStaticDir = join(process.cwd(), 'public', 'static');
if (existsSync(contentStaticDir)) {
  cpSync(contentStaticDir, publicStaticDir, { recursive: true });
}

const SITE_URL = 'https://docs.stacktape.com';
const stacktapeRepoRoot = join(process.cwd(), '..');

// Dev-only routes that must never enter the sitemap.
const SITEMAP_EXCLUDE = [/\/review(\/|$)/, /\/api-ref-preview(\/|$)/, /\/generation(\/|$)/];

export default defineConfig({
  site: SITE_URL,
  outDir: './out',
  trailingSlash: 'always',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  markdown: {
    // Our own <CodeBlock> island handles syntax highlighting (Shiki + Twoslash in the browser),
    // so disable Astro's compile-time Shiki. Smartquotes would corrupt code/inline text.
    // Astro 7 replaced `markdown.{remarkPlugins,rehypePlugins,gfm,smartypants}` with a single
    // `processor` built via `unified({...})` from @astrojs/markdown-remark; the MDX integration
    // inherits the processor's plugins/options, so these still apply to every .mdx page.
    syntaxHighlight: false,
    processor: unified({
      gfm: true,
      smartypants: false,
      // Astro auto-injects heading ids and collects `headings` (used for the TOC), so no
      // slug/autolink plugins are needed. remark order matters: fix-jsx-template-indent (restores
      // verbatim code in <CodeBlock tabs> template literals, undoing MDX's multi-line dedent) →
      // docs transforms → code-to-component (last, so it converts every resulting code node).
      remarkPlugins: [remarkFixJsxTemplateIndent, remarkDocsTransforms, remarkCodeToComponent],
      rehypePlugins: [rehypeDocsLinks]
    })
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDE.some((re) => re.test(new URL(page).pathname)),
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const sourcePath = pathname === '/' ? 'docs/index.mdx' : `docs${pathname.replace(/\/$/, '')}.mdx`;
        const lastModified = getGitLastModified(sourcePath);
        return lastModified ? { ...item, lastmod: new Date(lastModified) } : item;
      }
    })
  ],
  vite: {
    plugins: [yaml(), tailwindcss()],
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
      include: ['shiki', '@shikijs/twoslash', 'twoslash-cdn', 'typescript']
    },
    server: {
      // Components import generated types/schemas from ../@generated (outside the docs/ root).
      fs: { allow: [stacktapeRepoRoot] }
    }
  }
});
