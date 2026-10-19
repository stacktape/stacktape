import type { ReactNode } from 'react';

/**
 * Things the developer may do, one per row: what it is and what it does on the left, its button on the right.
 *
 * The optional extras before a deploy and the next steps after one used to be a heading and a paragraph each,
 * which made six equal headings out of one button that matters and several that do not. Rows on one surface
 * say "these belong together, pick any" and keep each action where the eye ends the sentence.
 */
export function RowList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label}>
      <h3 className="wizard-section-heading">{label}</h3>
      <ul className="wizard-rows">{children}</ul>
    </section>
  );
}

export function Row({
  title,
  description,
  action,
  children
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A button or link, aligned to the row's first line. */
  action?: ReactNode;
  /** Detail that belongs to the row: a command, a result. Spans the row's full width. */
  children?: ReactNode;
}) {
  return (
    <li className="wizard-row">
      <div className="wizard-row-head">
        <div className="min-w-0">
          <p className="wizard-row-title">{title}</p>
          {description !== undefined && <p className="wizard-row-text">{description}</p>}
        </div>
        {action !== undefined && <div className="wizard-row-action">{action}</div>}
      </div>
      {children !== undefined && <div className="wizard-row-body">{children}</div>}
    </li>
  );
}
