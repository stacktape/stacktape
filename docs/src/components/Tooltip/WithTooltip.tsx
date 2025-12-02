import type { TippyProps } from '@tippyjs/react';
import Tippy from '@tippyjs/react';
import { typographyCss } from '@/styles/global';

export function WithTooltip({
  placement,
  tooltipText,
  tooltipWidth,
  trigger = 'hover',
  children
}: {
  placement?: TippyProps['placement'];
  tooltipText: ReactNode;
  tooltipWidth?: Css['width'];
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
          css={{
            ...typographyCss,
            ...(tooltipWidth && { width: tooltipWidth }),
            textAlign: 'left',
            padding: '5px 10px 5px 10px',
            p: {
              marginBottom: '10px',
              textAlign: 'left'
            },
            'p:last-child': {
              marginBottom: '0px'
            }
          }}
        >
          {tooltipText}
        </div>
      }
    >
      <span style={{ display: 'inline-block' }}>{children}</span>
    </Tippy>
  );
}
