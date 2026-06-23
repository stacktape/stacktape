import isAbsoluteUrl from 'is-absolute-url';
import merge from 'lodash/merge';
import { onMaxW500 } from '@/styles/variables';
import { ensureTrailingSlash } from '../../../scripts/utils/misc';

// Plain anchor used for any explicit <Link> in MDX/components. Internal navigation smoothness +
// prefetch is provided globally by Astro's <ClientRouter />, so no router is needed here.
export function Link({ children, href, rootCss }: { children: any; href: string; rootCss?: Css }) {
  const adjustedHref = href.endsWith('.mdx') ? href.replace('.mdx', '') : href;

  const isExternal =
    isAbsoluteUrl(href) && !href.startsWith('https://docs.stacktape.com') && !href.startsWith('http://localhost');

  const css: Css = merge(
    {
      color: 'rgb(34, 186, 181)',
      whiteSpace: 'nowrap',
      [onMaxW500]: { whiteSpace: 'normal' },
      fontWeight: 500
    },
    rootCss
  );

  return isExternal ? (
    <a css={css} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <a css={css} href={ensureTrailingSlash(adjustedHref)}>
      {children}
    </a>
  );
}
