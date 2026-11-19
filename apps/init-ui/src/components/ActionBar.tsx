import type { ReactNode } from 'react';

/**
 * The full-width bar at the bottom of Review and Deploy: the price on the left, the next step on the right.
 *
 * A stand-in with the shared API, so the workspace can be built against it; the wizard's own bar replaces it.
 */
export function ActionBar({ price, note, children }: { price?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <footer className="ws-actionbar">
      <div className="ws-actionbar-inner">
        <div className="ws-actionbar-price">{price}</div>
        <div className="ws-actionbar-actions">
          {note !== undefined && <span className="ws-actionbar-note">{note}</span>}
          {children}
        </div>
      </div>
    </footer>
  );
}
