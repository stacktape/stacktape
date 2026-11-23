import type { ComponentPropsWithoutRef } from 'react';

// Plain anchor. Astro's <ClientRouter /> upgrades these to smooth view-transition navigations with
// prefetch, so no router is needed.
export function Anchor({ children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  return <a {...rest}>{children}</a>;
}
