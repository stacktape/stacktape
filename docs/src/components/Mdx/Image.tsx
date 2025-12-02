import Image from 'next/image';

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
      css={{ ...style, boxShadow: 'none !important', width: '100%', height: 'auto' }}
      {...rest}
    />
  );
}
