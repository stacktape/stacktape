/*
 * A terminal window. Same chrome as the editor, but the body is monospaced and sits on the darkest
 * surface the palette has, so a transcript reads as a terminal rather than as a code sample.
 */
import type { ReactNode } from 'react';
import { TrafficLights } from './TrafficLights';

export type TerminalFrameProps = {
  /** Centred in the title bar, e.g. `stacktape — deploy · zsh`. */
  title: ReactNode;
  children: ReactNode;
  className?: string | undefined;
};

export function TerminalFrame({ title, children, className }: TerminalFrameProps) {
  return (
    <div className={['surface-frame', 'surface-frame--terminal', className].filter(Boolean).join(' ')}>
      <div className="surface-frame__bar">
        <TrafficLights />
        <span className="surface-frame__title">{title}</span>
        <div className="surface-frame__actions" />
      </div>
      <div className="surface-frame__body">{children}</div>
    </div>
  );
}
