import type { ReactNode } from 'react';

/**
 * One next step after a deploy: an icon, what it is and why in one line, its action at the right, and anything that
 * belongs to it (a command, a sign-in, the secrets a pipeline needs) underneath.
 *
 * The rows sit in one raised panel, separated by hairlines, so the page reads as a short list rather than a grid of
 * cards. A row with a `label` is also a named region, for the steps a test or a screen reader looks for by name.
 */
export function Row({
  icon,
  title,
  description,
  action,
  label,
  children
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** A button or link, aligned to the row's first line. */
  action?: ReactNode;
  label?: string;
  children?: ReactNode;
}) {
  const content = (
    <>
      <div className="w-next-head">
        <div>
          <h3>{title}</h3>
          {description !== undefined && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children !== undefined && children !== null && children !== false && (
        <div className="w-next-body">{children}</div>
      )}
    </>
  );
  return (
    <li className="w-next-row">
      <span aria-hidden className="w-next-icon">
        {icon}
      </span>
      {label === undefined ? (
        <div className="min-w-0">{content}</div>
      ) : (
        <section aria-label={label} className="min-w-0">
          {content}
        </section>
      )}
    </li>
  );
}
