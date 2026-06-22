/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import Head from 'next/head';
import { type DocsSeo, SITE_NAME, SITE_URL } from '@/utils/seo';

/**
 * Per-page <head>: title, description, canonical, per-page OG/Twitter overrides, and the
 * page's JSON-LD (TechArticle + BreadcrumbList, plus FAQPage when the page has a FAQ).
 * Built entirely at build time so the static export ships it in the HTML.
 */
export function DocsHead({ seo }: { seo: DocsSeo }) {
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: seo.title,
      description: seo.description,
      url: seo.canonical,
      inLanguage: 'en',
      ...(seo.dateModified && { dateModified: seo.dateModified }),
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
      publisher: { '@type': 'Organization', name: 'Stacktape', url: 'https://stacktape.com' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: seo.breadcrumb.map((crumb, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: crumb.name,
        item: crumb.url
      }))
    }
  ];

  if (seo.faqItems.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seo.faqItems.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer }
      }))
    });
  }

  return (
    <Head>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.canonical} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.canonical} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      {jsonLd.map((node, idx) => (
        <script key={idx} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }} />
      ))}
    </Head>
  );
}
