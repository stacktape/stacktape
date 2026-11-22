import { LuArrowUpRight } from 'react-icons/lu';

/**
 * A Console capture. The image opens at full size, so the labels stay readable on a phone. The built-site validator
 * fails the build when a referenced capture is missing.
 */
export function ConsoleScreenshot({
  src,
  alt,
  caption,
  maxWidth
}: {
  src: string;
  alt: string;
  caption?: string;
  maxWidth?: number;
  /** Kept for existing call sites: every figure now has the same frame. */
  border?: boolean;
}) {
  return (
    <figure className="docs-figure" style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}>
      <a href={src} target="_blank" rel="noopener" className="docs-figure-frame docs-unstyled-link">
        <img src={src} alt={alt} loading="lazy" decoding="async" />
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
