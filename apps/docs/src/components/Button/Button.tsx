import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

/**
 * The documentation site's only button shape: a styled link. Every call site — the header, landing
 * call-to-actions, and the starter-project gallery — navigates somewhere, so the Console version's
 * submit/loading/disabled/tooltip modes are deliberately absent.
 */
export function Button({
  text,
  linkTo,
  icon,
  iconPosition = 'beginning',
  visualType,
  rootClassName,
  onClick,
  width = '100%',
  height = '32.5px'
}: {
  text: ReactNode;
  linkTo: string;
  icon?: ReactNode;
  iconPosition?: 'beginning' | 'end';
  visualType: 'primary' | 'secondary' | 'plain';
  rootClassName?: string;
  onClick?: () => void;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
}) {
  const iconElement = icon ? (
    <span
      className={clsx(
        'flex items-center justify-center',
        iconPosition === 'beginning' ? 'mr-[11px] ml-[5px]' : 'mr-[2px] ml-[9px]'
      )}
    >
      {icon}
    </span>
  ) : null;

  const isExternal = linkTo.startsWith('http');

  return (
    <a
      className="block w-fit"
      href={linkTo}
      onClick={onClick}
      {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      <button
        type="button"
        className={clsx('stp-button stp-btn', `stp-btn-${visualType}`, rootClassName)}
        style={{ cursor: 'pointer', height, width }}
      >
        {iconPosition === 'beginning' && iconElement}
        <span className="m-0 text-center font-medium text-fc-primary align-middle truncate">{text}</span>
        {iconPosition === 'end' && iconElement}
      </button>
    </a>
  );
}
