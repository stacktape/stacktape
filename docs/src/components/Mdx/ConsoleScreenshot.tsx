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
          ...(border && {
            border: `1px solid rgba(255, 255, 255, 0.1)`,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
          })
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          css={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>
      {caption && (
        <figcaption
          css={{
            marginTop: '10px',
            fontSize: '13px',
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
