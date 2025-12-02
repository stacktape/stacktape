import { getCalApi } from '@calcom/embed-react';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import { geistFont, geistMonoFont } from '@/styles/fonts';
import config from '../../config';

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
      <Script id="crisp" strategy="afterInteractive">
        {`
          window.$crisp = [];
          window.CRISP_WEBSITE_ID = ${JSON.stringify(config.crisp.id)};
          (function() {
            var d = document;
            var s = d.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = true;
            d.getElementsByTagName("head")[0].appendChild(s);
          })();
        `}
      </Script>
      <Component className={[geistFont.className, geistMonoFont.className]} {...pageProps} />
    </>
  );
}
