import type { ReactElement, ReactNode } from 'react';
import type { TippyProps } from '@tippyjs/react';
import type { Instance as TippyInstance, Plugin } from 'tippy.js';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { openLayer } from '../layer/layer';

export type TooltipPlacement = TippyProps['placement'];

/**
 * `label` names a control or says why it is disabled: one short line, small, above the trigger. `help` explains a
 * concept behind a help icon: a headline and a few sentences, opening below the trigger towards the content.
 */
export type TooltipVariant = 'label' | 'help';

export type TooltipProps = {
  children: ReactElement;
  content: ReactNode;
  headline?: ReactNode;
  placement?: TooltipPlacement;
  trigger?: 'click' | 'hover';
  maxWidth?: number | string;
  disabled?: boolean;
  variant?: TooltipVariant;
};

const DEFAULTS: Record<TooltipVariant, { placement: NonNullable<TooltipPlacement>; maxWidth: number; delay: number }> =
  {
    // A short wait keeps labels from flashing while the pointer crosses a toolbar.
    label: { placement: 'top', maxWidth: 300, delay: 150 },
    help: { placement: 'bottom-start', maxWidth: 360, delay: 0 }
  };

/** Tooltips whose latest trigger was focus moving into them, rather than the pointer. */
const openedByFocus = new WeakSet<TippyInstance>();

/**
 * A shown tooltip is the innermost layer: Escape hides it and nothing under it, without moving the pointer (WCAG 1.4.13).
 * The layer opens when the tooltip is mounted, so a show that is cancelled leaves no layer that would swallow Escape.
 */
const closesWithEscape: Plugin = {
  fn(instance) {
    let removeLayer: (() => void) | undefined;
    const remove = () => {
      removeLayer?.();
      removeLayer = undefined;
    };
    return {
      onTrigger(_, event) {
        if (event.type === 'focusin') openedByFocus.add(instance);
        else openedByFocus.delete(instance);
      },
      onMount() {
        remove();
        removeLayer = openLayer('hint', () => instance.hide());
      },
      onHide: remove,
      onDestroy: remove
    };
  }
};
const plugins = [closesWithEscape];

/**
 * Focus opens a tooltip only when it came from the keyboard. A menu row or a closing dialog gives focus back to its
 * trigger by script after a click; a label popping up there would stay until the next click.
 */
const showsForThisFocus = (instance: TippyInstance) =>
  !openedByFocus.has(instance) || !!document.activeElement?.matches(':focus-visible');

/**
 * A portal-backed tooltip. It opens when the pointer is over its trigger or keyboard focus is inside it (`focusin`, so a
 * wrapper around a button works), and Escape hides it. A help tooltip and a click tooltip stay open while the pointer
 * moves onto them, so a long explanation can be read and selected.
 */
export function Tooltip({
  children,
  content,
  disabled = false,
  headline,
  maxWidth,
  placement,
  trigger = 'hover',
  variant = headline ? 'help' : 'label'
}: TooltipProps) {
  const defaults = DEFAULTS[variant];
  return (
    <Tippy
      animation={false}
      appendTo={() => document.body}
      // Tippy marks an interactive tooltip's trigger as expanded; a help tooltip is read, not a menu that opens.
      aria={{ expanded: false }}
      delay={[defaults.delay, 0]}
      disabled={disabled}
      interactive={trigger === 'click' || variant === 'help'}
      maxWidth={500}
      offset={[0, 8]}
      onShow={(instance) => (showsForThisFocus(instance) ? undefined : false)}
      placement={placement ?? defaults.placement}
      plugins={plugins}
      render={(attributes) => (
        <div
          {...attributes}
          className={`stp-ui-tooltip stp-ui-tooltip--${variant}`}
          style={{ maxWidth: maxWidth ?? defaults.maxWidth }}
        >
          {headline ? <strong className="stp-ui-tooltip__headline">{headline}</strong> : null}
          <div className="stp-ui-tooltip__content">{content}</div>
        </div>
      )}
      trigger={trigger === 'hover' ? 'mouseenter focusin' : 'click'}
      zIndex={10002}
    >
      {children}
    </Tippy>
  );
}
