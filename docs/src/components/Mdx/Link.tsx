import type { CSSProperties, ReactNode } from 'react';
import isAbsoluteUrl from 'is-absolute-url';
import clsx from 'clsx';
import { ensureTrailingSlash } from '../../../scripts/utils/misc';

// Plain anchor used for any explicit <Link> in MDX/components. Internal navigation smoothness +
// prefetch is provided globally by Astro's <ClientRouter />, so no router is needed here.
// Base styling is the `.stp-mdx-link` class; callers may pass an extra `className`/`style` (the
// sidebar passes its row class + a per-depth margin).
export function Link({
  children,
  href,
  className,
  style
}: {
  children: ReactNode;
  href: string;
  className?: string;
  style?: CSSProperties;
}) {
  const adjustedHref = href.endsWith('.mdx') ? href.replace('.mdx', '') : href;

  const isExternal =
    isAbsoluteUrl(href) && !href.startsWith('https://docs.stacktape.com') && !href.startsWith('http://localhost');

  const cls = clsx('stp-mdx-link', className);

  return isExternal ? (
    <a className={cls} style={style} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <a className={cls} style={style} href={ensureTrailingSlash(adjustedHref)}>
      {children}
    </a>
  );
}
