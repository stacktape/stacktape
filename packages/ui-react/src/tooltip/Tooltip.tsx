import type { ReactElement, ReactNode } from 'react';
import type { TippyProps } from '@tippyjs/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

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

/** A portal-backed tooltip. Hover content is transient; click content may be interactive. */
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
      delay={[defaults.delay, 0]}
      disabled={disabled}
      interactive={trigger === 'click'}
      maxWidth={500}
      offset={[0, 8]}
      placement={placement ?? defaults.placement}
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
      trigger={trigger === 'hover' ? 'mouseenter focus' : 'click'}
      zIndex={10002}
    >
      {children}
    </Tippy>
  );
}
