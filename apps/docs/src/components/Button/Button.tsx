import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { ButtonLink } from '@stacktape/ui-react/button';

/**
 * The documentation site's only button shape: a styled link. Every call site — the header, landing
 * call-to-actions, and the starter-project gallery — navigates somewhere, so the shared package's
 * submit/loading/disabled modes are deliberately absent here.
 *
 * What this wrapper owns is the site's own layout contract: the anchor shrinks to its content unless
 * a call site asks for a width, external destinations open in a new tab, and the horizontal padding
 * is the site's rather than the shared default.
 */
export function Button({
  children,
  href,
  icon,
  iconPosition = 'start',
  variant,
  className,
  onClick,
  width = '100%',
  height = '32.5px'
}: {
  children: ReactNode;
  href: string;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  variant: 'primary' | 'secondary' | 'plain';
  className?: string;
  onClick?: () => void;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
}) {
  const isExternal = href.startsWith('http');

  return (
    <span className="block w-fit">
      <ButtonLink
        className={clsx('stp-doc-button', className)}
        href={href}
        icon={icon}
        iconPosition={iconPosition}
        onClick={onClick}
        style={{ width, height }}
        variant={variant}
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {children}
      </ButtonLink>
    </span>
  );
}
