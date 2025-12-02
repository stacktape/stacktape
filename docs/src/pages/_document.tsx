/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { Global } from '@emotion/react';
import { Head, Html, Main, NextScript } from 'next/document';
import { globalCss } from '@/styles/global';
import config from '../../config';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          key="apollo"
          defer
          async
          dangerouslySetInnerHTML={{
            __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");
                o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,
                o.onload=function(){window.trackingFunctions.onLoad({appId:"6632714d8e944701af733bac"})},
                document.head.appendChild(o)}initApollo();`
          }}
        />
        <script defer data-domain="docs.stacktape.com" src="https://plausible.io/js/script.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.plausible = window.plausible || function(){(window.plausible.q = window.plausible.q || []).push(arguments)};`
          }}
        />
        <meta property="og:title" content={config.metadata.name} />
        <meta property="og:site_name" content={config.metadata.name} />
        <meta property="og:url" content={config.metadata.url} />
        <meta property="og:description" content={config.metadata.description} />
        <meta property="og:type" content="product" />
        <meta property="og:image" content={config.metadata.siteimage} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="docs.stacktape.com" />
        <meta property="twitter:url" content={config.metadata.url} />
        <meta name="twitter:title" content={config.metadata.title} />
        <meta name="twitter:description" content={config.metadata.description} />
        <meta name="twitter:image" content={config.metadata.siteimage} />

        <meta name="description" content={config.metadata.description} />
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
