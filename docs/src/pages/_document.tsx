/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { Global } from '@emotion/react';
import { Head, Html, Main, NextScript } from 'next/document';
import { globalCss } from '@/styles/global';
import config from '../../config';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Analytics (Apollo, Plausible) moved to _app.tsx via next/script so they load off the
            critical render path instead of blocking in the document <head>. */}
        {/* Site-level OG/Twitter defaults only. Per-page title, description, canonical, og:title/
            og:description/og:url and twitter:title/description are emitted by DocsHead (next/head)
            so they are not duplicated/overridden here. */}
        <meta property="og:site_name" content={config.metadata.name} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={config.metadata.siteimage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="docs.stacktape.com" />
        <meta name="twitter:image" content={config.metadata.siteimage} />

        {/* Site-level structured data (entity grounding for search + AI answer engines). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Stacktape',
                url: 'https://stacktape.com',
                logo: config.metadata.siteimage,
                sameAs: Object.values(config.social)
              },
              { '@context': 'https://schema.org', '@type': 'WebSite', name: config.metadata.name, url: config.metadata.url },
              {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'Stacktape',
                applicationCategory: 'DeveloperApplication',
                operatingSystem: 'Cross-platform',
                url: 'https://stacktape.com',
                description: config.metadata.description
              }
            ])
          }}
        />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>
      <Global styles={globalCss} />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
