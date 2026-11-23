import clsx from 'clsx';

/**
 * A Console capture with an optional caption. Rendered statically — the built-site validator fails
 * the build when a referenced capture is missing, so there is no runtime placeholder to hydrate for.
 */
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
  return (
    <figure className="my-[30px] flex flex-col items-center">
      <div className="relative w-full" style={{ maxWidth: `${maxWidth}px` }}>
        {border && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[9%] -bottom-[10px] h-[28px] rounded-full bg-[rgba(20,184,178,0.16)] blur-[24px]"
          />
        )}
        <div
          className={clsx(
            'relative overflow-hidden rounded-[14px]',
            border && 'shadow-[0_24px_64px_-28px_rgba(0,0,0,0.95),0_12px_32px_-24px_rgba(20,184,178,0.42)]'
          )}
        >
          <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
          {border && (
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
