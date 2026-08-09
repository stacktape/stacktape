import type { CSSProperties, ReactNode } from 'react';
import type { FrameworkIconName } from '../resource-icon/catalog.js';

const iconUrl: Record<FrameworkIconName, string> = {
  astro: new URL('./assets/astro.svg', import.meta.url).href,
  gatsby: new URL('./assets/gatsby.svg', import.meta.url).href,
  laravel: new URL('./assets/laravel.svg', import.meta.url).href,
  mongodb: new URL('./assets/mongodb.svg', import.meta.url).href,
  nextjs: new URL('./assets/nextjs-icon-dark-bg.svg', import.meta.url).href,
  nuxt: new URL('./assets/nuxt.svg', import.meta.url).href,
  remix: new URL('./assets/remix-letter-glowing.svg', import.meta.url).href,
  solidstart: new URL('./assets/solidjs.svg', import.meta.url).href,
  sveltekit: new URL('./assets/svelte.svg', import.meta.url).href,
  'tanstack-start': new URL('./assets/react-query.svg', import.meta.url).href,
  upstash: new URL('./assets/upstash-icon-dark-bg.svg', import.meta.url).href,
  vite: new URL('./assets/vitejs.svg', import.meta.url).href
};

export type FrameworkIconRenderer = ({ size }: { size: number }) => ReactNode;

/** Adapts framework artwork to metadata APIs that store an icon renderer rather than a node. */
export const createFrameworkIconRenderer = (name: FrameworkIconName): FrameworkIconRenderer =>
  function FrameworkIconRendererComponent({ size }) {
    return <FrameworkIcon name={name} size={size} />;
  };

/** Renderer metadata for menus and preset catalogs; the SVG assets still have one owner. */
export const FRAMEWORK_ICON_RENDERERS = Object.fromEntries(
  (Object.keys(iconUrl) as FrameworkIconName[]).map((name) => [name, createFrameworkIconRenderer(name)])
) as Record<FrameworkIconName, FrameworkIconRenderer>;

export function FrameworkIcon({
  name,
  size,
  label,
  className,
  style
}: {
  name: FrameworkIconName;
  size: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={className}
      height={size}
      src={iconUrl[name]}
      style={style}
      width={size}
    />
  );
}
