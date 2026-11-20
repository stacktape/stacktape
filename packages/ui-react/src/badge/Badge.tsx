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
 * How loud a count is. Only a count of incidents nobody has taken is coloured, by the worst one: `danger` when one is
 * critical, `warning` otherwise, the colours of a project's status dot. Every other count is `neutral`, a number of
 * things waiting in a list (open errors, firing alarms, findings to fix): each has its own severity on its row, and a
 * second colour beside the incident that a firing alarm already opened leaves people guessing which one matters.
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
