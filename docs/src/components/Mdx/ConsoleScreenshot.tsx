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
  // Keep the docs readable when a referenced capture is temporarily missing during regeneration.
  const [failed, setFailed] = useState(!src);
  const showPlaceholder = failed || !src;

  return (
    <figure className="my-[30px] flex flex-col items-center">
      <div className="relative w-full" style={{ maxWidth: `${maxWidth}px` }}>
        {border && !showPlaceholder && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[9%] -bottom-[10px] h-[28px] rounded-full bg-[rgba(20,184,178,0.16)] blur-[24px]"
          />
        )}
        <div
          className={clsx(
            'relative overflow-hidden rounded-[14px]',
            border &&
              !showPlaceholder &&
              'shadow-[0_24px_64px_-28px_rgba(0,0,0,0.95),0_12px_32px_-24px_rgba(20,184,178,0.42)]'
          )}
        >
          {showPlaceholder ? (
            <div
              role="img"
              aria-label={alt}
              className="flex min-h-[200px] flex-col items-center justify-center gap-[12px] rounded-[14px] border border-dashed border-border bg-[rgba(255,255,255,0.025)] px-[28px] py-[44px] text-center"
            >
              <LuImage size={30} color={colors.fontColorTernary} className="opacity-70" />
              <span className="stp-typography text-[0.72rem] font-semibold uppercase leading-[1.4] tracking-[0.05em] text-fc-ternary">
                Screenshot coming soon
              </span>
              <span className="stp-typography max-w-[520px] text-[0.85rem] leading-[1.6] text-fc-secondary">{alt}</span>
            </div>
          ) : (
            <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="block h-auto w-full" />
          )}
          {border && !showPlaceholder && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_1px_0_0_rgba(255,255,255,0.035),inset_-1px_0_0_rgba(255,255,255,0.035)]"
            />
          )}
        </div>
      </div>
      {caption && (
        <figcaption className="stp-typography mt-[10px] text-[13px] italic leading-[1.5] text-fc-ternary text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
