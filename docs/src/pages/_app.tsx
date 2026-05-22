import { getCalApi } from '@calcom/embed-react';
import Head from 'next/head';
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
      <Component className={[geistFont.className, geistMonoFont.className]} {...pageProps} />
    </>
  );
}
