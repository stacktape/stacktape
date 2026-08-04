import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { ensureTrailingSlash, isExternalHref } from '@/utils/seo';

// Plain anchor used for any explicit <Link> in components. Internal navigation smoothness and
// prefetch come globally from Astro's <ClientRouter />, so no router is needed here. Base styling is
// the `.stp-mdx-link` class; callers may pass an extra `className`/`style` (the sidebar passes its
// row class plus a per-depth margin).
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
  const cls = clsx('stp-mdx-link', className);

  return isExternalHref(href) ? (
    <a className={cls} style={style} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <a className={cls} style={style} href={ensureTrailingSlash(href.replace(/\.mdx?$/, ''))}>
      {children}
    </a>
  );
}
