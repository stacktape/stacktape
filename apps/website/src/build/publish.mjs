import { readFile, writeFile } from 'node:fs/promises';

export const websitePublication = (stage) => ({
  name: 'website-publication',
  hooks: {
    'astro:build:done': async ({ dir, pages, logger }) => {
      const canonicalUrls = await Promise.all(
        pages.map(async ({ pathname }) => {
          const parts = pathname.split('/').filter(Boolean);
          if (parts[0] === '404') return;
          const html = await readFile(new URL([...parts, 'index.html'].join('/'), dir), 'utf8');
          return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        })
      );
      const sitemap =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        canonicalUrls
          .filter(Boolean)
          .toSorted()
          .map((url) => `  <url><loc>${url.replaceAll('&', '&amp;')}</loc></url>\n`)
          .join('') +
        '</urlset>\n';
      const robots =
        stage === 'production'
          ? 'User-agent: *\nAllow: /\nSitemap: https://stacktape.com/sitemap.xml\n'
          : 'User-agent: *\nDisallow: /\n';
      await Promise.all([
        writeFile(new URL('sitemap.xml', dir), sitemap),
        writeFile(new URL('robots.txt', dir), robots)
      ]);
      logger.info(`Wrote robots.txt and sitemap.xml for ${stage}.`);
    }
  }
});
