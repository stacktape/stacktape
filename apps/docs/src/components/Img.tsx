import type { ComponentPropsWithoutRef } from 'react';

/** Either a plain URL or an asset imported through Vite, which resolves to `{ src }`. */
type ImgSrc = string | { src: string };

/** Plain `<img>` that also accepts an imported asset. `alt` defaults to empty (decorative). */
export function Img({ src, alt = '', ...rest }: Omit<ComponentPropsWithoutRef<'img'>, 'src'> & { src: ImgSrc }) {
  return <img src={typeof src === 'string' ? src : src.src} alt={alt} {...rest} />;
}
