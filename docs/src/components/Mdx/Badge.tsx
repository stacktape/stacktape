import type { CSSProperties } from 'react';
import colorFn from 'color';
import clsx from 'clsx';
import { colors } from '../../styles/variables';

export function Badge({
  children,
  backgroundColor,
  hoverBackgroundColor,
  onClick,
  border,
  fontSize,
  padding,
  style,
  className,
  ...props
}: {
  children: React.ReactNode;
  backgroundColor: string;
  hoverBackgroundColor?: string;
  onClick?: any;
  border?: string;
  fontSize?: string;
  padding?: string;
  style?: CSSProperties;
  className?: string;
  [anyProp: string]: any;
}) {
  const textColor = colorFn(backgroundColor).luminosity() < 0.5 ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
  const interactive = Boolean(onClick || hoverBackgroundColor);

  return (
    <span
      className={clsx(
        'stp-typography',
        'inline-flex items-center min-w-[14px] rounded-[4px] font-medium leading-[1.4] whitespace-nowrap align-middle no-underline',
        hoverBackgroundColor &&
          'transition-[background] duration-150 ease hover:[background:var(--badge-hover-bg)]',
        className
      )}
      style={{
        padding: padding || '1px 7px',
        background: backgroundColor,
        border: border || `1px solid ${colors.darkerBackground}`,
        color: textColor,
        fontSize: fontSize || '0.8rem',
        userSelect: interactive ? 'none' : 'initial',
        cursor: interactive ? 'pointer' : 'initial',
        ...(hoverBackgroundColor ? ({ '--badge-hover-bg': hoverBackgroundColor } as CSSProperties) : {}),
        ...style
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </span>
  );
}
