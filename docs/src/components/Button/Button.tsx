import type { CSSProperties, ReactNode } from 'react';
import type { Placement } from 'tippy.js';
import merge from 'lodash/merge';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import PulseLoader from 'react-spinners/PulseLoader';
import { boxShadow, colors, ellipsis } from '../../styles/variables';
import { WithTooltip } from '../Tooltip/WithTooltip';

export function Button({
  text,
  onClick,
  rootCss,
  linkTo,
  icon,
  type = 'button',
  disabled,
  isLoading,
  svgIcon,
  iconPosition = 'beginning',
  visualType,
  briefTextAfterClick,
  buttonCss,
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
  rootCss?: Css;
  linkTo?: string | null;
  icon?: ReactNode;
  svgIcon?: string;
  width?: Css['width'];
  height?: Css['height'];
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  iconPosition?: 'beginning' | 'end';
  visualType: 'primary' | 'secondary' | 'ternary' | 'negative' | 'plain';
  buttonCss?: Css;
  briefTextAfterClick?: ReactNode;
  disabledTooltipText?: ReactNode;
  form?: string;
  badge?: ReactNode;
  badgeCss?: Css;
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
  const buttonStyle = {
    primary: {
      border: '1px solid #40958e',
      background: 'linear-gradient(90deg, rgb(12, 95, 95), rgb(27, 109, 103))',
      backgroundSize: '200% 200%',
      transition: 'all 0.25s ease-in-out',
      '&:hover': {
        boxShadow: '0 1.5px 12px rgba(32, 109, 109, 0.9)'
      },
      ...(isDisabled && {
        opacity: 0.6
      })
    },
    secondary: {
      border: '1px solid rgb(17, 17, 17)',
      background: 'linear-gradient(90deg, rgb(40, 45, 45), rgb(33, 38, 38))',
      transition: 'all 0.25s ease-in-out',
      boxShadow: '0 1.5px 20px rgba(19, 24, 24, 0.9)',
      '&:hover': {
        boxShadow: '0 1px 2px 2.5px rgba(19, 24, 24, 0.9)'
      },
      ...(isDisabled && {
        opacity: 0.6
      })
    },
    plain: {
      '*': { fontWeight: 'bold' }
    },
    ternary: {
      background: colors.secondary,
      border: `1px solid ${colors.secondaryButtonBorder}`,
      boxShadow,
      ...(isDisabled && {
        opacity: 0.8
      })
    },
    negative: {
      border: '1px solid #232323',
      backgroundColor: colors.error,
      ...(!isDisabled && {
        '&:hover': {}
      })
    }
  }[visualType];
  const rootStyle: Css = {
    borderImageSlice: 1,
    borderRadius: '4.5px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textDecoration: 'none',
    color: colors.fontColorPrimary,
    backgroundSize: '200% auto',
    cursor: isLoading ? 'default' : isDisabled ? 'default' : 'pointer',
    height,
    width,
    padding: '0px 10px 0px 14px',
    ...buttonStyle
  };
  const css = merge(rootStyle, rootCss || ({} as CSSProperties));
  const textComponent = (
    <span
      css={{
        margin: 0,
        textAlign: 'center',
        fontWeight: 500,
        color: colors.fontColorPrimary,
        verticalAlign: 'middle',
        ...ellipsis
      }}
    >
      {textToShow}
    </span>
  );

  const iconEl = icon ? (
    <span
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(iconPosition === 'beginning'
          ? { marginRight: '11px', marginLeft: '5px' }
          : { marginRight: '2px', marginLeft: '9px' })
      }}
    >
      {icon}
    </span>
  ) : null;
  const svgIconEl = svgIcon ? (
    <Image src={svgIcon} width={20} height={20} css={{ marginRight: '10px', marginLeft: '5px' }} alt={`${text} icon`} />
  ) : null;
  const isExternalLink = linkTo && linkTo.startsWith('http');
  if (linkTo && !isExternalLink && !isDisabled) {
    return (
      <Link
        {...(id && { id })}
        css={{ display: 'block', width: 'fit-content' }}
        href={linkTo}
        onClick={adjustedOnClick}
      >
        <button
          type="button"
          className="stp-button"
          css={{ ...css, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
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
        css={{ display: 'block', width: 'fit-content' }}
        rel="noopener noreferrer"
        {...(!isDisabled ? { href: linkTo } : {})}
        onClick={adjustedOnClick}
      >
        <button type="button" className="stp-button" css={css}>
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
      className="stp-button"
      css={merge(
        {
          position: 'relative',
          cursor: isDisabled ? 'default' : 'pointer',
          '*': { cursor: isDisabled ? 'default' : 'pointer' },
          margin: css.margin
        },
        css
      )}
    >
      <button
        type={type}
        {...(form && { form })}
        css={merge({ width, height, padding: visualType === 'plain' ? '0px 4px' : '0px 16px' }, buttonCss)}
        disabled={isDisabled}
        onClick={adjustedOnClick}
        {...(dataCalLink && { 'data-cal-link': dataCalLink })}
      >
        {isLoading ? (
          <div css={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <PulseLoader size={4} color="#F4F4F5" />
          </div>
        ) : (
          <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
