/**
 * The package's own loading indicator. It exists so a loading `Button` or `IconButton` does not drag
 * a spinner library into every consumer: it is three pulsing dots drawn in `currentColor` with CSS
 * only, and it respects `prefers-reduced-motion`.
 *
 * It is decorative. The control that renders it owns the accessible state (`aria-busy`) and keeps its
 * own label in the accessibility tree, so the dots are hidden from assistive technology.
 */
export function Spinner({ className, size, style }: { className?: string; size?: number; style?: CSSProperties }) {
  const spinnerStyle = {
    ...(size === undefined ? {} : { '--stp-ui-spinner-dot-size': `${size}px` }),
    ...style
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className={className ? `stp-ui-spinner ${className}` : 'stp-ui-spinner'}
      style={spinnerStyle}
    >
      <span className="stp-ui-spinner__dot" />
      <span className="stp-ui-spinner__dot" />
      <span className="stp-ui-spinner__dot" />
    </span>
  );
}
import type { CSSProperties } from 'react';
