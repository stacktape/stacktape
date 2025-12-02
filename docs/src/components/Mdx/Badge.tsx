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
  ...props
}: {
  children: React.ReactNode;
  backgroundColor: string;
  hoverBackgroundColor?: string;
  onClick?: any;
  border?: string;
  fontSize?: string;
  padding?: string;
  [anyProp: string]: any;
}) {
  const textColor = colorFn(backgroundColor).luminosity() < 0.5 ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';

  return (
    <span
      css={{
        ...typographyCss,
        padding: padding || '2px 7px',
        background: backgroundColor,
        border: border || `1px solid ${colors.darkerBackground}`,
        color: textColor,
        borderRadius: '3px',
        minWidth: '14px',
        fontWeight: 400,
        fontSize: fontSize || '0.85rem',
        alignSelf: 'flex-start',
        marginLeft: '3px',
        marginRight: '3px',
        whiteSpace: 'nowrap',
        overflowX: 'scroll',
        alignItems: 'center',
        userSelect: onClick || hoverBackgroundColor ? 'none' : 'initial',
        cursor: onClick || hoverBackgroundColor ? 'pointer' : 'initial',
        textDecoration: 'none'
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </span>
  );
}
