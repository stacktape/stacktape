import type { CSSProperties, ReactNode } from 'react';
import type { Placement } from 'tippy.js';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import PulseLoader from 'react-spinners/PulseLoader';
import { WithTooltip } from '../Tooltip/WithTooltip';

export function IconButton({
  icon,
  onClick,
  rootClassName,
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
  rootClassName?: string;
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

  const style: CSSProperties = {
    margin: '2px',
    cursor: isLoading ? 'initial' : 'pointer',
    ...(size ? { width: size, height: size } : {})
  };

  const ButtonElement = (
    <div className={clsx('stp-icon-button', rootClassName)} style={style} onClick={adjustedOnClick} role="button">
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
