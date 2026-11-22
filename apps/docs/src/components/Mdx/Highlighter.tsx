import type { ReactNode } from 'react';
import { AlertOctagon, AlertTriangle, Info as InfoIcon, Zap } from 'react-feather';

type Callout = { children?: ReactNode };
type Variant = 'info' | 'tip' | 'warning' | 'error';

// The icon's shape names the kind, so the kind never depends on colour; the label is read by screen readers.
const VARIANTS: Record<Variant, { label: string; icon: ReactNode }> = {
  info: { label: 'Note', icon: <InfoIcon size={16} aria-hidden /> },
  tip: { label: 'Tip', icon: <Zap size={16} aria-hidden /> },
  warning: { label: 'Warning', icon: <AlertTriangle size={16} aria-hidden /> },
  error: { label: 'Error', icon: <AlertOctagon size={16} aria-hidden /> }
};

/**
 * The `<Info>`, `<Tip>`, `<Warning>` and `<Error>` callouts. Quiet by design: a left rule, a faint wash and an icon.
 * The body is ordinary prose, so links and inline code keep their usual look.
 */
function Highlighter({ type, children }: Callout & { type: Variant }) {
  const variant = VARIANTS[type];
  return (
    <div className="docs-callout" data-variant={type} role="note">
      <span className="docs-callout-icon">{variant.icon}</span>
      <div className="docs-callout-body">
        <span className="sr-only-docs">{variant.label}: </span>
        {children}
      </div>
    </div>
  );
}

export const Warning = (props: Callout) => <Highlighter type="warning" {...props} />;
export const Info = (props: Callout) => <Highlighter type="info" {...props} />;
export const Tip = (props: Callout) => <Highlighter type="tip" {...props} />;
export const ErrorCallout = (props: Callout) => <Highlighter type="error" {...props} />;
