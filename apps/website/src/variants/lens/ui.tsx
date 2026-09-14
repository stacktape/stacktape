import type { ReactNode } from 'react';
import type { BadgeTone } from '@stacktape/ui-react/badge';
import { Badge } from '@stacktape/ui-react/badge';
import { Button } from '@stacktape/ui-react/button';
import { Switch } from '@stacktape/ui-react/switch';

/*
 * The product's own controls, rendered on the server inside the screens.
 *
 * None of these behave: a screen is a picture of the product, not the product. The `.astro` files
 * render them without a client directive, so no JavaScript ships for them. They are React wrappers
 * only because an `.astro` template cannot hand a React component an element prop such as `icon`.
 */

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

const ICONS = { arrow: <ArrowIcon /> } as const;

type PreviewButtonProps = {
  variant: 'primary' | 'secondary';
  icon?: keyof typeof ICONS;
  iconPosition?: 'start' | 'end';
  small?: boolean;
  children: ReactNode;
};

/** A button that looks pressable and is not: screens never navigate or submit. */
export function PreviewButton({ variant, icon, iconPosition = 'start', small = false, children }: PreviewButtonProps) {
  return (
    <Button
      aria-disabled="true"
      className={small ? 'ls-btn ls-btn--small' : 'ls-btn'}
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
    <Badge caps={caps} className={dot ? 'ls-badge ls-badge--dot' : 'ls-badge'} tone={tone}>
      {dot ? <i aria-hidden="true" className="ls-badge__dot" /> : null}
      {children}
    </Badge>
  );
}

/** A guardrail's switch, shown on and locked: it is a picture of a rule that is in force. */
export function OnSwitch({ label }: { label: string }) {
  return <Switch checked className="ls-switch" disabled label={label} onCheckedChange={() => {}} />;
}
