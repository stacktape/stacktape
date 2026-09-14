import type { ReactNode } from 'react';
import type { BadgeTone } from '@stacktape/ui-react/badge';
import { Badge } from '@stacktape/ui-react/badge';
import { Button } from '@stacktape/ui-react/button';
import { Switch } from '@stacktape/ui-react/switch';

/*
 * The product's own controls, rendered on the server inside the strips.
 *
 * None of these behave: a strip is a picture of a screen, not the screen. The `.astro` files render
 * them without a client directive, so no JavaScript ships for them. They are React wrappers only
 * because an `.astro` template cannot hand a React component an element prop such as `icon`.
 */

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <path
      d="M3 8h9.5M9 4.5 12.5 8 9 11.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ICONS = { copy: <CopyIcon />, arrow: <ArrowIcon /> } as const;

type PreviewButtonProps = {
  variant: 'primary' | 'secondary';
  icon?: keyof typeof ICONS;
  iconPosition?: 'start' | 'end';
  small?: boolean;
  children: ReactNode;
};

/** A button that looks pressable and is not: strips never navigate or submit. */
export function PreviewButton({ variant, icon, iconPosition = 'start', small = false, children }: PreviewButtonProps) {
  return (
    <Button
      aria-disabled="true"
      className={small ? 'sg-btn sg-btn--small' : 'sg-btn'}
      icon={icon ? ICONS[icon] : undefined}
      iconPosition={iconPosition}
      tabIndex={-1}
      variant={variant}
    >
      {children}
    </Button>
  );
}

type StatusBadgeProps = {
  tone: BadgeTone;
  /** A live dot before the word, for states that are happening now. */
  dot?: boolean;
  caps?: boolean;
  children: ReactNode;
};

export function StatusBadge({ tone, dot = false, caps = true, children }: StatusBadgeProps) {
  return (
    <Badge caps={caps} className={dot ? 'sg-badge sg-badge--dot' : 'sg-badge'} tone={tone}>
      {dot ? <i aria-hidden="true" className="sg-badge__dot" /> : null}
      {children}
    </Badge>
  );
}

/** The automatic-remediation switch, shown off and locked: it is a picture of a default. */
export function OptInSwitch({ label }: { label: string }) {
  return <Switch checked={false} className="sg-optin__switch" disabled label={label} onCheckedChange={() => {}} />;
}
