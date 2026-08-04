import type { CSSProperties } from 'react';
import { Img as Image } from '@/components/Img';

/** Replaces the native `img` tag in MDX content. */
export function MdxImage({ src, alt, style }: { src: string; alt: string; style?: CSSProperties }) {
  return (
    <Image
      loading="lazy"
      width={600}
      height={400}
      src={src}
      alt={alt}
      className="h-auto w-full shadow-none!"
      style={style}
    />
  );
}
