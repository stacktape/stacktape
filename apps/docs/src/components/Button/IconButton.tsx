import type { ReactNode } from 'react';
import clsx from 'clsx';

/** Icon-only action button. The documentation site uses it for the mobile navigation toggle. */
export function IconButton({
  icon,
  onClick,
  label,
  rootClassName
}: {
  icon: ReactNode;
  onClick: () => void;
  label: string;
  rootClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={clsx('stp-icon-button', rootClassName)}
      style={{ margin: '2px', cursor: 'pointer' }}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
