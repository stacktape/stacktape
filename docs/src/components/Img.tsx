// Drop-in replacement for next/image (the site ran next/image with `unoptimized: true`, i.e. a
// plain <img>). Accepts either a string URL or an imported asset object ({ src }).
type ImgSrc = string | { src: string };

export function Img({
  src,
  alt = '',
  width,
  height,
  ...rest
}: {
  src: ImgSrc;
  alt?: string;
  width?: number | string;
  height?: number | string;
  [key: string]: any;
}) {
  const resolved = typeof src === 'string' ? src : src?.src;
  return <img src={resolved} alt={alt} width={width} height={height} {...rest} />;
}

export default Img;
