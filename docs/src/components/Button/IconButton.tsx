import type { ReactNode } from 'react';
import type { Placement } from 'tippy.js';
import { merge } from 'lodash';
import { useEffect, useState } from 'react';
import PulseLoader from 'react-spinners/PulseLoader';
import { colors, iconButtonStyle } from '../../styles/variables';
import { WithTooltip } from '../Tooltip/WithTooltip';

export function IconButton({
  icon,
  onClick,
  rootCss,
  tooltipText,
  briefIconAfterClick,
  size,
  isLoading,
  tooltipPlacement,
  disableHover: _disableHover
}: {
  onClick: AnyFunction;
  icon: ReactNode;
  briefIconAfterClick?: ReactNode;
  rootCss?: Css;
  tooltipText?: string;
  size?: number;
  isLoading?: boolean;
  tooltipPlacement?: Placement;
  disableHover?: boolean;
}) {
  const [iconToShow, setIconToShow] = useState(icon);
  useEffect(() => {
    setIconToShow(icon);
  }, [icon]);

  const adjustedOnClick = (...props) => {
    if (briefIconAfterClick) {
      setIconToShow(briefIconAfterClick);
      setTimeout(() => setIconToShow(icon), 500);
    }
    if (onClick) {
      onClick(...props);
    }
  };

  const ButtonElement = (
    <div
      css={merge(
        {
          ...iconButtonStyle,
          width: size || '34px',
          height: size || '34px',
          borderRadius: '8px',
          margin: '2px',
          cursor: isLoading ? 'initial' : 'pointer'
        },
        rootCss || {}
      )}
      onClick={adjustedOnClick}
      role="button"
    >
      {isLoading ? <PulseLoader size={5} color="#F4F4F5" /> : iconToShow}
    </div>
  );

  if (tooltipText) {
    return (
      <WithTooltip placement={tooltipPlacement || undefined} tooltipText={tooltipText}>
        {ButtonElement}
      </WithTooltip>
    );
  }

  return ButtonElement;
}
