import type { ReactNode } from 'react';

/**
 * Things the wizard decided, needs or offers, one per row: what it is and what it means on the left,
 * its control at the right, and anything that belongs to it (options, names, a command) under both.
 *
 * It used to be one container per kind: accent-bar cards for decisions, a panel with hairlines for the
 * pre-deploy checklist, an info callout for the alarms, bare headings for the optional extras. Four looks
 * for one kind of thing is what makes a page read as assembled. One surface, one row, everywhere.
 */
export function RowList({
  label,
  lede,
  footer,
  children
}: {
  label: string;
  /** One sentence under the heading, when the heading alone does not say what the rows have in common. */
  lede?: string;
  /** A disclosure or note under the surface, such as "Show 2 smaller ones". */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={label}>
      <h3 className={`wizard-section-heading${lede === undefined ? '' : ' m-0'}`}>{label}</h3>
      {lede !== undefined && <p className="wizard-lede mt-1 mb-4">{lede}</p>}
      <ul className="wizard-rows">{children}</ul>
      {footer !== undefined && <div className="mt-3">{footer}</div>}
    </section>
  );
}

export function Row({
  title,
  description,
  action,
  isDone = false,
  isBusy = false,
  children
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A button or link, aligned to the row's first line. */
  action?: ReactNode;
  /** Finished: a check at the right, where the action was, so the titles keep one left edge. */
  isDone?: boolean;
  /** A change is being applied: the row waits visibly instead of the whole page. */
  isBusy?: boolean;
  /** Detail that belongs to the row: a command, a result, the other options. Spans the row's full width. */
  children?: ReactNode;
}) {
  return (
    <li className={`wizard-row${isBusy ? ' is-busy' : ''}`}>
      <div className="wizard-row-head">
        <div className="min-w-0">
          <p className="wizard-row-title">{title}</p>
          {description !== undefined && <p className="wizard-row-text">{description}</p>}
        </div>
        {action !== undefined && <div className="wizard-row-action">{action}</div>}
        {isDone && (
          <div className="wizard-row-action wizard-row-done">
            <span aria-hidden className="wizard-check-mark is-passed">
              ✓
            </span>
            Done
          </div>
        )}
      </div>
      {children !== undefined && children !== null && children !== false && (
        <div className="wizard-row-body">{children}</div>
      )}
    </li>
  );
}
