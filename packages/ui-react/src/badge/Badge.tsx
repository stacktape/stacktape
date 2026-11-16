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

/**
 * How loud a count is, by what it counts: `danger` for something failing now (a critical incident), `warning` for what
 * needs a look soon (another open incident, a firing alarm, a finding to fix), `neutral` for a number that is only a
 * number (open errors: most running apps have a few, and a red count for each teaches people to ignore red).
 */
export type CountBadgeTone = 'danger' | 'warning' | 'neutral';

/**
 * The one count badge: how many things need attention. `dot` is its form where there is no room for a number, such as
 * the collapsed navigation rail; the surrounding control's name and tooltip carry the number.
 */
export function CountBadge({
  value,
  display = 'count',
  tone = 'danger'
}: {
  value: number;
  display?: 'count' | 'dot';
  tone?: CountBadgeTone;
}) {
  if (display === 'dot') {
    return (
      <span
        className={`stp-ui-badge stp-ui-badge--${tone} stp-ui-badge--solid stp-ui-count-badge--dot`}
        aria-hidden
        data-count={value}
      />
    );
  }
  return (
    <Badge className="stp-ui-count-badge" pill size="small" tone={tone} variant="solid">
      {value > 99 ? '99+' : value}
    </Badge>
  );
}
