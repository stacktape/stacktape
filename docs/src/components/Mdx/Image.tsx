import { Img as Image } from '@/components/Img';

export function MdxImage({
  src,
  alt,
  style,
  ...rest
}: {
  src: string;
  alt: string;
  style: React.CSSProperties;
  [key: string]: any;
}) {
  // console.log({ src, alt, style, rest });

  return (
    <Image
      loading="lazy"
      width={600}
      height={400}
      src={src}
      alt={alt}
      className="h-auto w-full shadow-none!"
      style={style}
      {...rest}
    />
  );
}
