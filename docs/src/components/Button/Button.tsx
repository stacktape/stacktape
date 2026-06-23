import type { CSSProperties, ReactNode } from 'react';
import type { Placement } from 'tippy.js';
import merge from 'lodash/merge';
import { Img as Image } from '@/components/Img';
import { Anchor as Link } from '@/components/Anchor';
import { useEffect, useState } from 'react';
import PulseLoader from 'react-spinners/PulseLoader';
import {
  colors,
  ellipsis,
  plainHoverBoxShadow,
  primaryHoverBoxShadow,
  secondaryHoverBoxShadow,
  semanticHoverBoxShadow
} from '../../styles/variables';
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
      background: 'linear-gradient(135deg, rgb(12, 95, 95), rgb(27, 109, 103))',
      boxShadow:
        '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(81, 231, 236, 0.5), inset 0 1px 0 rgba(43, 232, 239, 0.4)',
      border: 'none',
      transition: 'all 250ms ease, transform 150ms ease',
      '&:hover': {
        boxShadow: primaryHoverBoxShadow
      },
      '&:active': {
        transform: 'scale(0.98)'
      },
      ...(isDisabled && { opacity: 0.6 })
    },
    secondary: {
      background: colors.elementBackground,
      boxShadow:
        '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      border: 'none',
      transition: 'all 250ms ease, transform 150ms ease',
      '&:hover': {
        boxShadow: secondaryHoverBoxShadow
      },
      '&:active': {
        transform: 'scale(0.98)'
      },
      ...(isDisabled && { opacity: 0.6 })
    },
    plain: {
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',
      transition: 'all 250ms ease',
      '*': { fontWeight: 'bold' },
      '&:hover': {
        boxShadow: plainHoverBoxShadow
      }
    },
    ternary: {
      background: 'linear-gradient(135deg, rgba(34, 87, 122, 1) 0%, rgba(40, 95, 130, 0.95) 100%)',
      boxShadow:
        '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      border: 'none',
      transition: 'all 250ms ease, transform 150ms ease',
      '&:hover': {
        boxShadow: semanticHoverBoxShadow
      },
      '&:active': {
        transform: 'scale(0.98)'
      },
      ...(isDisabled && { opacity: 0.8 })
    },
    negative: {
      background: 'linear-gradient(135deg, rgb(235, 97, 97) 0%, rgb(200, 80, 80) 100%)',
      boxShadow:
        '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      border: 'none',
      transition: 'all 250ms ease, transform 150ms ease',
      '&:hover': {
        boxShadow: semanticHoverBoxShadow
      },
      '&:active': {
        transform: 'scale(0.98)'
      }
    }
  }[visualType];
  const rootStyle: Css = {
    borderImageSlice: 1,
    borderRadius: '8px',
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
