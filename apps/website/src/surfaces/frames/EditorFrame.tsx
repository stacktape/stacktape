/*
 * An editor window: traffic lights, a title, and an optional strip of controls on the right of the
 * title bar (tabs, toggles, a copy button).
 *
 * Presentation only and server-renderable — it holds no state, so a surface that needs no
 * interactivity can embed it from `.astro` without shipping any JavaScript.
 */
import type { ReactNode } from 'react';
import { TrafficLights } from './TrafficLights';

export type EditorFrameProps = {
  /** Centred in the title bar. Usually a filename. */
  title: ReactNode;
  /** Right-aligned in the title bar. Keep it to one or two controls. */
  actions?: ReactNode;
  children: ReactNode;
  /** Appended after the frame's own classes, so a caller's utilities win. */
  className?: string | undefined;
};

export function EditorFrame({ title, actions, children, className }: EditorFrameProps) {
  return (
    <div className={['surface-frame', className].filter(Boolean).join(' ')}>
      <div className="surface-frame__bar">
        <TrafficLights />
        <span className="surface-frame__title">{title}</span>
        <div className="surface-frame__actions">{actions}</div>
      </div>
      <div className="surface-frame__body">{children}</div>
    </div>
  );
}
