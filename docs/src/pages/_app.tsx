import { getCalApi } from '@calcom/embed-react';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import { geistFont, geistMonoFont } from '@/styles/fonts';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal('init', {});
    })();
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* Analytics — deferred off the critical render path (moved out of the _document <head>). */}
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible = window.plausible || function(){(window.plausible.q = window.plausible.q || []).push(arguments)};`}
      </Script>
      <Script src="https://plausible.io/js/script.js" data-domain="docs.stacktape.com" strategy="afterInteractive" />
      <Script id="apollo-tracker" strategy="lazyOnload">
        {`function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"6632714d8e944701af733bac"})},document.head.appendChild(o)}initApollo();`}
      </Script>
      <Component className={[geistFont.className, geistMonoFont.className]} {...pageProps} />
    </>
  );
}
