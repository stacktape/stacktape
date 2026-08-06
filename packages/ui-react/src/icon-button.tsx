import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import type { ButtonVariant } from './button.js';
import { Spinner } from './spinner.js';

type IconButtonAppearance = {
  variant?: ButtonVariant | undefined;
  /** Appended after the component's own classes, so a consumer's utility or Emotion class wins. */
  className?: string | undefined;
  /**
   * The control's edge length in pixels. Icon buttons are square, and the surrounding layout — a
   * table row, a toolbar — decides how large they may be. Defaults to 32.
   */
  size?: number | undefined;
  icon: ReactNode;
  /**
   * The accessible name. An icon-only control has no text, so this is required rather than optional:
   * without it the control is announced as "button" and nothing else.
   */
  label: string;
};

const iconButtonClassName = (variant: ButtonVariant = 'secondary', className?: string): string =>
  ['stp-ui-button', 'stp-ui-button--icon', `stp-ui-button--${variant}`, className].filter(Boolean).join(' ');

const withSize = (size: number | undefined, style: CSSProperties | undefined): CSSProperties | undefined =>
  size === undefined ? style : { width: size, height: size, ...style };

export type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> &
  IconButtonAppearance & {
    /** Blocks activation, marks the control busy and swaps the icon for the loading indicator. */
    isLoading?: boolean | undefined;
  };

/** A square, icon-only native `<button>`. */
export function IconButton({
  variant,
  className,
  size,
  icon,
  label,
  isLoading = false,
  disabled = false,
  style,
  type = 'button',
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      className={iconButtonClassName(variant, className)}
      style={withSize(size, style)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      <span className="stp-ui-button__content">{isLoading ? <Spinner /> : icon}</span>
    </button>
  );
}

export type IconButtonLinkProps = Omit<ComponentPropsWithRef<'a'>, 'children' | 'aria-label'> & IconButtonAppearance;

/**
 * A square, icon-only native `<a>`. Use it for navigation; for a disabled or busy state render an
 * `IconButton` instead, because a link has neither.
 */
export function IconButtonLink({ variant, className, size, icon, label, style, ...anchorProps }: IconButtonLinkProps) {
  return (
    <a
      {...anchorProps}
      aria-label={label}
      className={iconButtonClassName(variant, className)}
      style={withSize(size, style)}
    >
      <span className="stp-ui-button__content">{icon}</span>
    </a>
  );
}
