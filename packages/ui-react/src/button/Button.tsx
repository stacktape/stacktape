import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Spinner } from '../spinner/Spinner.js';

/**
 * How much visual weight the control carries. The recipes behind these names live in `styles.css`;
 * a consumer picks the meaning, never the gradient.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'plain';

/** Where the optional icon sits relative to the label. */
export type ButtonIconPosition = 'start' | 'end';

type ButtonAppearance = {
  variant: ButtonVariant;
  /** Appended after the component's own classes, so a consumer's utility or Emotion class wins. */
  className?: string | undefined;
};

type ButtonContentProps = {
  children: ReactNode;
  icon?: ReactNode | undefined;
  iconPosition?: ButtonIconPosition | undefined;
};

/**
 * The class list a `Button` renders.
 *
 * Exported for the one case the components cannot cover: a router's own link component. Passing this
 * to a `<Link>` keeps navigation with the router and appearance with this package, which is why
 * nothing here imports a router.
 */
export const buttonClassName = ({ variant, className }: ButtonAppearance): string =>
  ['stp-ui-button', `stp-ui-button--${variant}`, className].filter(Boolean).join(' ');

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> &
  ButtonAppearance &
  ButtonContentProps & {
    /**
     * Blocks activation, marks the control busy and swaps the label for the loading indicator. The
     * label stays in the accessibility tree and keeps the control's width, so nothing reflows.
     */
    isLoading?: boolean | undefined;
  };

/**
 * A native `<button>`. Use it for anything that acts on the current page — submitting, toggling,
 * opening a dialog.
 */
export function Button({
  variant,
  className,
  children,
  icon,
  iconPosition = 'start',
  isLoading = false,
  disabled = false,
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={buttonClassName({ variant, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      <ButtonContent icon={icon} iconPosition={iconPosition} isLoading={isLoading}>
        {children}
      </ButtonContent>
    </button>
  );
}

export type ButtonLinkProps = Omit<ComponentPropsWithRef<'a'>, 'children'> & ButtonAppearance & ButtonContentProps;

/**
 * A native `<a>` that looks like a `Button`. Use it for anything that navigates.
 *
 * A link cannot be disabled or busy: render a disabled `Button` instead of an inert link, and never
 * nest one inside the other — a `<button>` inside an `<a>` is invalid HTML and gives keyboard users
 * two overlapping targets.
 */
export function ButtonLink({
  variant,
  className,
  children,
  icon,
  iconPosition = 'start',
  ...anchorProps
}: ButtonLinkProps) {
  return (
    <a {...anchorProps} className={buttonClassName({ variant, className })}>
      <ButtonContent icon={icon} iconPosition={iconPosition}>
        {children}
      </ButtonContent>
    </a>
  );
}

/**
 * The label, icon and busy layers a `Button` renders inside itself.
 *
 * Exported for the same reason as `buttonClassName`: a router's own link component can then look and
 * lay out exactly like a `ButtonLink` without copying this markup. Reach for it only there — on an
 * ordinary `<a>`, use `ButtonLink`.
 */
export function ButtonContent({
  children,
  icon,
  iconPosition,
  isLoading = false
}: ButtonContentProps & { isLoading?: boolean | undefined }) {
  // The icon carries no spacing of its own — `stp-ui-button__content` gaps it away from the label —
  // so which side it sits on is decided entirely by the order it is rendered in.
  const iconElement = icon ? <span className="stp-ui-button__icon">{icon}</span> : null;

  return (
    <>
      <span className={isLoading ? 'stp-ui-button__content stp-ui-button__content--busy' : 'stp-ui-button__content'}>
        {iconPosition === 'end' ? null : iconElement}
        <span className="stp-ui-button__label">{children}</span>
        {iconPosition === 'end' ? iconElement : null}
      </span>
      {isLoading ? <Spinner className="stp-ui-button__spinner" /> : null}
    </>
  );
}
