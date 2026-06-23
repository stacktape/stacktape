import type { ReactNode } from 'react';

// Drop-in replacement for next/link — renders a plain anchor. Astro's <ClientRouter /> upgrades
// these to smooth view-transition navigations with prefetch, so no router is needed.
export function Anchor({
  href,
  children,
  ...rest
}: {
  href?: string;
  children?: ReactNode;
  [key: string]: any;
}) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export default Anchor;
