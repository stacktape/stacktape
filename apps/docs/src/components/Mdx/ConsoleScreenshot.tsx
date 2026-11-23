import { LuArrowUpRight } from 'react-icons/lu';

/**
 * A Console or init wizard capture. The image opens at full size, so the labels stay readable on a phone. The
 * built-site validator fails the build when a referenced capture is missing.
 *
 * `width` and `height` are the capture's size in CSS pixels (half the pixel size of a 2x image). They reserve the
 * image's space before it loads, and the figure never grows wider than `width`.
 */
export function ConsoleScreenshot({
  src,
  alt,
  caption,
  width,
  height,
  maxWidth
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  /** Kept for existing call sites: every figure now has the same frame. */
  border?: boolean;
}) {
  const limit = maxWidth ?? width;
  return (
    <figure className="docs-figure" style={limit ? { maxWidth: `${limit}px` } : undefined}>
      <a href={src} target="_blank" rel="noopener" className="docs-figure-frame docs-unstyled-link">
        <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      </a>
      <figcaption>
        <span>{caption}</span>
        <a href={src} target="_blank" rel="noopener" className="docs-figure-open docs-unstyled-link">
          Open full size
          <LuArrowUpRight size={13} aria-hidden />
        </a>
      </figcaption>
    </figure>
  );
}
