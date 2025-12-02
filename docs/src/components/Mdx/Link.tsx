import isAbsoluteUrl from 'is-absolute-url';
import { merge } from 'lodash';
import { useRouter } from 'next/router';
import { useRef } from 'react';
import { onMaxW500 } from '@/styles/variables';
import { preloadPage, startViewTransitionWithLoading } from '@/utils/view-transition';
import { ensureTrailingSlash } from '../../../scripts/utils/misc';

export function Link({ children, href, rootCss }: { children: any; href: string; rootCss?: Css }) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const adjustedHref = href.endsWith('.mdx') ? href.replace('.mdx', '') : href;

  const isExternal =
    isAbsoluteUrl(href) && !href.startsWith('https://docs.stacktape.com') && !href.startsWith('http://localhost');

  const css: Css = merge(
    {
      color: 'rgb(34, 186, 181)',
      whiteSpace: 'nowrap',
      [onMaxW500]: {
        whiteSpace: 'normal'
      },
      fontWeight: 500
    },
    rootCss
  );

  const handleInternalNavigation = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (isNavigatingRef.current) return; // Prevent double clicks

    isNavigatingRef.current = true;
    const finalHref = ensureTrailingSlash(adjustedHref);

    try {
      // Fast view transition with minimal overhead
      await startViewTransitionWithLoading(async () => {
        await router.push(finalHref);
      });
    } catch {
      // Fast fallback
      window.location.href = finalHref;
    } finally {
      isNavigatingRef.current = false;
    }
  };

  const handleMouseEnter = () => {
    if (!isExternal && !isNavigatingRef.current) {
      // Quick preload on hover
      preloadPage(ensureTrailingSlash(adjustedHref), router);
    }
  };

  return isExternal ? (
    <a css={css} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <a
      css={css}
      href={ensureTrailingSlash(adjustedHref)}
      onClick={handleInternalNavigation}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </a>
  );
}
