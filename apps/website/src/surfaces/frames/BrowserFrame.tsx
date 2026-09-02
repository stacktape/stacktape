/*
 * A browser window: traffic lights and a URL pill.
 *
 * The URL is a plain string, never a link — these frames are recreations of a product screen, and a
 * clickable address bar inside a marketing illustration is a trap, not an affordance.
 */
import type { ReactNode } from 'react';
import { TrafficLights } from './TrafficLights';

export type BrowserFrameProps = {
  /** Shown in the address pill, e.g. `console.stacktape.com/projects/acme-project/production`. */
  url: string;
  children: ReactNode;
  className?: string | undefined;
};

export function BrowserFrame({ url, children, className }: BrowserFrameProps) {
  return (
    <div className={['surface-frame', className].filter(Boolean).join(' ')}>
      <div className="surface-frame__bar">
        <TrafficLights />
        <span className="surface-frame__url">
          <LockGlyph />
          {url}
        </span>
        <div className="surface-frame__actions" />
      </div>
      <div className="surface-frame__body">{children}</div>
    </div>
  );
}

/** A padlock, inline so the frame needs no icon dependency. */
function LockGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.25" width="7" height="5.25" rx="1.25" fill="currentColor" opacity="0.75" />
      <path d="M4.25 5.25V3.9a1.75 1.75 0 0 1 3.5 0v1.35" stroke="currentColor" strokeWidth="1.1" opacity="0.75" />
    </svg>
  );
}
