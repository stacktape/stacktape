import type { CSSProperties } from 'react';
import { Img as Image } from '@/components/Img';

/** Replaces the native `img` tag in MDX content. */
export function MdxImage({ src, alt, style }: { src: string; alt: string; style?: CSSProperties }) {
  return (
    <Image
      loading="lazy"
      decoding="async"
      width={600}
      height={400}
      src={src}
      alt={alt}
      className="my-[var(--docs-flow-block)] h-auto w-full"
      style={style}
    />
  );
}
