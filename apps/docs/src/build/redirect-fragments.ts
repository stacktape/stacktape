import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/**
 * Astro renders each `redirects` entry as a meta-refresh page, and a meta refresh drops the URL fragment, so a bookmark
 * to `/old-page/#section` would land at the top of the new page. This adds a script that redirects first and keeps the
 * fragment. The production CDN answers the same paths with a 301, which browsers already follow with the fragment.
 */
export const redirectFragments = (redirects: Record<string, string>): AstroIntegration => ({
  name: 'stacktape-redirect-fragments',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      await Promise.all(
        Object.entries(redirects).map(async ([from, to]) => {
          const file = fileURLToPath(new URL(`.${from}index.html`, dir));
          const html = await readFile(file, 'utf8');
          const refresh = '<meta http-equiv="refresh"';
          if (!html.includes(refresh)) throw new Error(`${file} is not an Astro redirect page.`);
          const script = `<script>location.replace(${JSON.stringify(to)}+location.hash)</script>`;
          await writeFile(file, html.replace(refresh, `${script}${refresh}`));
        })
      );
      logger.info(`Kept URL fragments on ${Object.keys(redirects).length} redirect pages.`);
    }
  }
});
