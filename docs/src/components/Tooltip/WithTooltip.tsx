import type { TippyProps } from '@tippyjs/react';
import Tippy from '@tippyjs/react';

export function WithTooltip({
  placement,
  tooltipText,
  tooltipWidth,
  trigger = 'hover',
  children
}: {
  placement?: TippyProps['placement'];
  tooltipText: ReactNode;
  tooltipWidth?: string | number;
  trigger?: 'click' | 'hover';
  children: ReactNode;
}) {
  return (
    <Tippy
      placement={placement || 'auto'}
      interactive
      animation={false}
      delay={0}
      arrow
      zIndex={10002}
      maxWidth={500}
      offset={[0, 14]}
      appendTo={() => document.body}
      trigger={trigger === 'hover' ? 'mouseenter focus' : 'click'}
      {...(trigger === 'hover' && {
        interactive: true
      })}
      content={
        <div
          className="stp-typography text-left py-[5px] px-[10px] [&_p]:mb-[10px] [&_p]:text-left [&_p:last-child]:mb-0"
          style={tooltipWidth ? { width: tooltipWidth } : undefined}
        >
          {tooltipText}
        </div>
      }
    >
      <span style={{ display: 'inline-block' }}>{children}</span>
    </Tippy>
  );
}
