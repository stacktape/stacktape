import type { CSSProperties, ReactNode } from 'react';
import type { Placement } from 'tippy.js';
import clsx from 'clsx';
import { Img as Image } from '@/components/Img';
import { Anchor as Link } from '@/components/Anchor';
import { useEffect, useState } from 'react';
import PulseLoader from 'react-spinners/PulseLoader';
import { WithTooltip } from '../Tooltip/WithTooltip';

const DISABLED_OPACITY: Record<string, number | undefined> = {
  primary: 0.6,
  secondary: 0.6,
  ternary: 0.8
};

export function Button({
  text,
  onClick,
  rootClassName,
  linkTo,
  icon,
  type = 'button',
  disabled,
  isLoading,
  svgIcon,
  iconPosition = 'beginning',
  visualType,
  briefTextAfterClick,
  buttonClassName,
  width = '100%',
  height = '32.5px',
  form,
  disabledTooltipText,
  dataCalLink,
  id,
  disabledTooltipPlacement
}: {
  text: string | ReactNode;
  onClick?: (...props: any[]) => any;
  rootClassName?: string;
  linkTo?: string | null;
  icon?: ReactNode;
  svgIcon?: string;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  iconPosition?: 'beginning' | 'end';
  visualType: 'primary' | 'secondary' | 'ternary' | 'negative' | 'plain';
  buttonClassName?: string;
  briefTextAfterClick?: ReactNode;
  disabledTooltipText?: ReactNode;
  form?: string;
  badge?: ReactNode;
  hasGlowingAnimation?: boolean;
  dataCalLink?: string;
  id?: string;
  disabledTooltipPlacement?: Placement;
}) {
  const [textToShow, setTextToShow] = useState(text);
  useEffect(() => {
    setTextToShow(text);
  }, [text]);
  const adjustedOnClick = (...props) => {
    if (briefTextAfterClick) {
      setTextToShow(briefTextAfterClick);
      setTimeout(() => setTextToShow(text), 500);
    }
    if (onClick) {
      onClick(...props);
    }
  };

  const isDisabled = disabled || isLoading || false;
  const rootClasses = clsx('stp-button stp-btn', `stp-btn-${visualType}`, rootClassName);
  const rootStyle: CSSProperties = {
    cursor: isLoading ? 'default' : isDisabled ? 'default' : 'pointer',
    height,
    width,
    ...(isDisabled && DISABLED_OPACITY[visualType] != null ? { opacity: DISABLED_OPACITY[visualType] } : {})
  };

  const textComponent = (
    <span className="m-0 text-center font-medium text-fc-primary align-middle truncate">{textToShow}</span>
  );

  const iconEl = icon ? (
    <span
      className={clsx(
        'flex items-center justify-center',
        iconPosition === 'beginning' ? 'mr-[11px] ml-[5px]' : 'mr-[2px] ml-[9px]'
      )}
    >
      {icon}
    </span>
  ) : null;
  const svgIconEl = svgIcon ? (
    <Image src={svgIcon} width={20} height={20} className="mr-[10px] ml-[5px]" alt={`${text} icon`} />
  ) : null;
  const isExternalLink = linkTo && linkTo.startsWith('http');
  if (linkTo && !isExternalLink && !isDisabled) {
    return (
      <Link {...(id && { id })} className="block w-fit" href={linkTo} onClick={adjustedOnClick}>
        <button type="button" className={rootClasses} style={rootStyle}>
          {svgIconEl}
          {iconPosition === 'beginning' && iconEl}
          {textComponent}
          {iconPosition === 'end' && iconEl}
        </button>
      </Link>
    );
  }
  if (isExternalLink && !isDisabled) {
    return (
      <a
        {...(id && { id })}
        target="_blank"
        className="block w-fit"
        rel="noopener noreferrer"
        {...(!isDisabled ? { href: linkTo } : {})}
        onClick={adjustedOnClick}
      >
        <button type="button" className={rootClasses} style={rootStyle}>
          {svgIconEl}
          {iconPosition === 'beginning' && iconEl}
          {textComponent}
          {iconPosition === 'end' && iconEl}
        </button>
      </a>
    );
  }

  const ButtonElement = (
    <div
      {...(id && { id })}
      className={clsx(rootClasses, 'relative', isDisabled ? '[&_*]:cursor-default' : '[&_*]:cursor-pointer')}
      style={{ ...rootStyle, cursor: isDisabled ? 'default' : 'pointer' }}
    >
      <button
        type={type}
        {...(form && { form })}
        className={buttonClassName}
        style={{ width, height, padding: visualType === 'plain' ? '0px 4px' : '0px 16px' }}
        disabled={isDisabled}
        onClick={adjustedOnClick}
        {...(dataCalLink && { 'data-cal-link': dataCalLink })}
      >
        {isLoading ? (
          <div className="w-full flex justify-center">
            <PulseLoader size={4} color="#F4F4F5" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {svgIconEl}
            {iconPosition === 'beginning' && iconEl}
            {textComponent}
            {iconPosition === 'end' && iconEl}
          </div>
        )}
      </button>
    </div>
  );

  if (disabledTooltipText && isDisabled && !isLoading) {
    return (
      <WithTooltip placement={disabledTooltipPlacement || 'auto'} tooltipText={disabledTooltipText}>
        {ButtonElement}
      </WithTooltip>
    );
  }

  return ButtonElement;
}
