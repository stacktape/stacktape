import colorFn from 'color';
import { typographyCss } from '@/styles/global';
import { colors } from '../../styles/variables';

export function Badge({
  children,
  backgroundColor,
  hoverBackgroundColor,
  onClick,
  border,
  fontSize,
  padding,
  css: cssOverride,
  ...props
}: {
  children: React.ReactNode;
  backgroundColor: string;
  hoverBackgroundColor?: string;
  onClick?: any;
  border?: string;
  fontSize?: string;
  padding?: string;
  css?: any;
  [anyProp: string]: any;
}) {
  const textColor = colorFn(backgroundColor).luminosity() < 0.5 ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
  const interactive = Boolean(onClick || hoverBackgroundColor);

  return (
    <span
      // Merge any caller-provided `css` (array form) instead of letting a spread `{...props}`
      // silently clobber the badge's own styling — that footgun previously stripped primitive
      // type badges of their pill styling, typography, and nowrap.
      css={[
        {
          ...typographyCss,
          display: 'inline-flex',
          alignItems: 'center',
          padding: padding || '1px 7px',
          background: backgroundColor,
          border: border || `1px solid ${colors.darkerBackground}`,
          color: textColor,
          borderRadius: '4px',
          minWidth: '14px',
          fontWeight: 500,
          fontSize: fontSize || '0.8rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          userSelect: interactive ? 'none' : 'initial',
          cursor: interactive ? 'pointer' : 'initial',
          textDecoration: 'none',
          ...(hoverBackgroundColor && {
            transition: 'background 150ms ease',
            '&:hover': { background: hoverBackgroundColor }
          })
        },
        cssOverride
      ]}
      onClick={onClick}
      {...props}
    >
      {children}
    </span>
  );
}
