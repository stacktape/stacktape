import clsx from 'clsx';
import { useState } from 'react';
import { LuImage } from 'react-icons/lu';
import { colors } from '../../styles/variables';

export function ConsoleScreenshot({
  src,
  alt,
  caption,
  maxWidth = 900,
  border = true
}: {
  src: string;
  alt: string;
  caption?: string;
  maxWidth?: number;
  border?: boolean;
}) {
  // The screenshot assets don't exist yet. Until they're added, fall back to a meaningful
  // placeholder (built from the `alt` description) instead of a broken image. When the real
  // image is dropped in at `src`, it loads normally and `onError` never fires.
  const [failed, setFailed] = useState(!src);
  const showPlaceholder = failed || !src;

  return (
    <figure className="my-[30px] flex flex-col items-center">
      <div
        className={clsx(
          'w-full overflow-hidden rounded-[8px]',
          border &&
            !showPlaceholder &&
            'border border-[rgba(255,255,255,0.1)] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
        )}
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {showPlaceholder ? (
          <div
            role="img"
            aria-label={alt}
            className="flex min-h-[200px] flex-col items-center justify-center gap-[12px] rounded-[8px] border border-dashed border-border bg-[rgba(255,255,255,0.025)] px-[28px] py-[44px] text-center"
          >
            <LuImage size={30} color={colors.fontColorTernary} className="opacity-70" />
            <span className="stp-typography text-[0.72rem] font-semibold uppercase leading-[1.4] tracking-[0.05em] text-fc-ternary">
              Screenshot coming soon
            </span>
            <span className="stp-typography max-w-[520px] text-[0.85rem] leading-[1.6] text-fc-secondary">
              {alt}
            </span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="block h-auto w-full"
          />
        )}
      </div>
      {caption && (
        <figcaption className="stp-typography mt-[10px] text-[13px] italic leading-[1.5] text-fc-ternary text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
