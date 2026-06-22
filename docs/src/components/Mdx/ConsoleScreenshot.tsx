import { useState } from 'react';
import { LuImage } from 'react-icons/lu';
import { colors } from '../../styles/variables';
import { typographyCss } from '../../styles/global';

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
    <figure
      css={{
        margin: '30px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div
        css={{
          maxWidth: `${maxWidth}px`,
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          ...(border &&
            !showPlaceholder && {
              border: `1px solid rgba(255, 255, 255, 0.1)`,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
            })
        }}
      >
        {showPlaceholder ? (
          <div
            role="img"
            aria-label={alt}
            css={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '44px 28px',
              minHeight: '200px',
              textAlign: 'center',
              border: `1px dashed ${colors.borderColor}`,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.025)'
            }}
          >
            <LuImage size={30} css={{ color: colors.fontColorTernary, opacity: 0.7 }} />
            <span
              css={{
                ...typographyCss,
                fontSize: '0.72rem',
                lineHeight: 1.4,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: colors.fontColorTernary
              }}
            >
              Screenshot coming soon
            </span>
            <span
              css={{
                ...typographyCss,
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: colors.fontColorSecondary,
                maxWidth: '520px'
              }}
            >
              {alt}
            </span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            css={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
          />
        )}
      </div>
      {caption && (
        <figcaption
          css={{
            ...typographyCss,
            marginTop: '10px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: colors.fontColorTernary,
            textAlign: 'center',
            fontStyle: 'italic'
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
