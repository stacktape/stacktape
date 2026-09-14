import type { ReactNode } from 'react';
import type { BadgeTone } from '@stacktape/ui-react/badge';
import { Badge } from '@stacktape/ui-react/badge';
import { Button } from '@stacktape/ui-react/button';

/*
 * The product's own controls, rendered on the server inside the screens.
 *
 * None of these behave: a screen is a picture of the product, not the product. The `.astro` files
 * render them without a client directive, so no JavaScript ships for them.
 */

type PreviewButtonProps = {
  variant: 'primary' | 'secondary';
  small?: boolean;
  children: ReactNode;
};

/** A button that looks pressable and is not: screens never navigate or submit. */
export function PreviewButton({ variant, small = false, children }: PreviewButtonProps) {
  return (
    <Button aria-disabled="true" className={small ? 'rm-btn rm-btn--small' : 'rm-btn'} tabIndex={-1} variant={variant}>
      {children}
    </Button>
  );
}

type StatusBadgeProps = {
  tone: BadgeTone;
  /** A live dot before the word, for states that are happening now. */
  dot?: boolean;
  /** Status words are capitals; a result with a count in it reads better as written. */
  caps?: boolean;
  children: ReactNode;
};

export function StatusBadge({ tone, dot = false, caps = true, children }: StatusBadgeProps) {
  return (
    <Badge caps={caps} className={dot ? 'rm-badge rm-badge--dot' : 'rm-badge'} tone={tone}>
      {dot ? <i aria-hidden="true" className="rm-badge__dot" /> : null}
      {children}
    </Badge>
  );
}
