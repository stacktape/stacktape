/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://docs.stacktape.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  // Internal drafts and dev-only routes must never enter the sitemap or be advertised to crawlers.
  exclude: [
    '/intro-variants',
    '/intro-variants/*',
    '/generation',
    '/review',
    '/review/*',
    '/api-ref-preview',
    '/api-ref-preview/*',
    '/404'
  ],
  transform: async (config, path) => {
    // Tune crawl signals: hubs > reference leaves; reference pages change rarely (not "daily").
    let priority = 0.6;
    let changefreq = 'weekly';
    if (path === '/') {
      priority = 1.0;
    } else if (/^\/getting-started(\/|$)/.test(path)) {
      priority = 0.9;
    } else if (/^\/(resources|configuration|deployment-and-lifecycle|packaging|observability)(\/|$)/.test(path)) {
      priority = 0.8;
    } else if (/^\/cli\//.test(path)) {
      priority = 0.4;
      changefreq = 'monthly';
    }
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined
    };
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      // Explicitly welcome the major AI crawlers so docs stay citable in AI answer engines
      // (and so a future restrictive edit can't silently drop them).
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'CCBot', allow: '/' }
    ],
    additionalSitemaps: ['https://docs.stacktape.com/sitemap.xml']
  }
};
