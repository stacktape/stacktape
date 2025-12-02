import type { TippyProps } from '@tippyjs/react';
import type { ReactNode } from 'react';
import { FaRegQuestionCircle } from 'react-icons/fa';
import { WithTooltip } from './WithTooltip';

export function Tooltip({
  size: _size,
  triggerCss: _triggerCss,
  ...props
}: {
  size?: number;
  placement?: TippyProps['placement'];
  tooltipText: ReactNode;
  tooltipWidth?: Css['width'];
  triggerCss?: Css;
  headline?: string;
  trigger?: 'click' | 'hover';
}) {
  return (
    <WithTooltip {...props}>
      <FaRegQuestionCircle />
    </WithTooltip>
  );
}
