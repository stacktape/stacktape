import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
export type BadgeVariant = 'soft' | 'solid' | 'outline' | 'raised';
export type BadgeSize = 'small' | 'medium';

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Fully round. Reserved for counts and other single-glyph values. */
  pill?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'span';
};

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

/** A compact semantic label whose tone has the same meaning in every Stacktape application. */
export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  size = 'medium',
  pill = false,
  title,
  className,
  style,
  as: Component = 'span'
}: BadgeProps) {
  return (
    <Component
      className={classes(
        'stp-ui-badge',
        `stp-ui-badge--${tone}`,
        `stp-ui-badge--${variant}`,
        `stp-ui-badge--${size}`,
        pill && 'stp-ui-badge--pill',
        className
      )}
      style={style}
      title={title}
    >
      {children}
    </Component>
  );
}

export function CountBadge({ value, isCompact = false }: { value: number; isCompact?: boolean }) {
  return (
    <Badge
      className={isCompact ? 'stp-ui-count-badge stp-ui-count-badge--compact' : 'stp-ui-count-badge'}
      pill
      size="small"
      tone="danger"
      variant="solid"
    >
      {value > 99 ? '99+' : value}
    </Badge>
  );
}
