import type { ReactElement, ReactNode } from 'react';
import type { TippyProps } from '@tippyjs/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export type TooltipPlacement = TippyProps['placement'];

export type TooltipProps = {
  children: ReactElement;
  content: ReactNode;
  headline?: ReactNode;
  placement?: TooltipPlacement;
  trigger?: 'click' | 'hover';
  maxWidth?: number | string;
  disabled?: boolean;
};

/** A portal-backed tooltip. Hover content is transient; click content may be interactive. */
export function Tooltip({
  children,
  content,
  disabled = false,
  headline,
  maxWidth = 420,
  placement = 'auto',
  trigger = 'hover'
}: TooltipProps) {
  return (
    <Tippy
      animation={false}
      appendTo={() => document.body}
      arrow
      delay={0}
      disabled={disabled}
      interactive={trigger === 'click'}
      maxWidth={500}
      offset={[0, 10]}
      placement={placement}
      render={(attributes) => (
        <div {...attributes} className="stp-ui-tooltip" style={{ maxWidth }}>
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
