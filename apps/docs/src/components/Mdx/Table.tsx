import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

/**
 * Markdown tables. The frame scrolls on its own when the table is wider than the article, so the page never scrolls
 * sideways. Browsers make such a scroll container keyboard-focusable themselves.
 */
export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="docs-table-wrap">
      <table className={clsx('docs-table', className)} {...props} />
    </div>
  );
}
