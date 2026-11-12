import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BiX } from 'react-icons/bi';
import { useLayer } from '../layer/layer';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  closeOnOverlayClick?: boolean;
  ariaLabel?: string;
  className?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  overlayStyle?: CSSProperties;
  bodyStyle?: CSSProperties;
};

/** Controls a person types into or picks from; the first one gets the focus when the dialog opens. */
const fieldSelector =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)';
const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog with focus containment, focus restoration, Escape handling and scroll locking.
 * Product-specific forms and confirmation flows compose this primitive instead of reimplementing it.
 * It is a `modal` layer: Escape closes it only when nothing opened inside or above it (a picker's list, a menu, a
 * second dialog) is open, and a dialog under another one leaves Tab to the one on top.
 */
export function Dialog({
  actions,
  ariaLabel = 'Dialog',
  bodyClassName,
  bodyStyle,
  children,
  className,
  closeOnOverlayClick = true,
  onClose,
  onOpenChange,
  open,
  overlayClassName,
  overlayStyle,
  style,
  subtitle,
  title
}: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const callbacksRef = useRef({ onClose, onOpenChange });
  callbacksRef.current = { onClose, onOpenChange };
  const isInnermost = useLayer(open, 'modal', () => {
    callbacksRef.current.onClose?.();
    callbacksRef.current.onOpenChange(false);
  });
  const isInnermostRef = useRef(isInnermost);
  isInnermostRef.current = isInnermost;

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const focusFrame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      // The first field of a form, so typing can start at once. A dialog without one focuses itself: focusing its
      // first button, tab or close "x" would open it with a focus ring on something nobody chose. Tab then reaches the
      // first control.
      (dialog?.querySelector<HTMLElement>(`.stp-ui-dialog__body :is(${fieldSelector})`) ?? dialog)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !isInnermostRef.current()) return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (control) => control.offsetParent !== null
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        // The dialog itself holds the focus right after opening; going back from it wraps to the last control.
        (document.activeElement === first ||
          document.activeElement === dialog ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedRef.current?.isConnected) previouslyFocusedRef.current.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => {
    onClose?.();
    onOpenChange(false);
  };

  return createPortal(
    <div className={['stp-ui-dialog__overlay', overlayClassName].filter(Boolean).join(' ')} style={overlayStyle}>
      {closeOnOverlayClick ? (
        <button aria-label="Close dialog" className="stp-ui-dialog__backdrop" onClick={close} type="button" />
      ) : null}
      <dialog
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-modal="true"
        className={['stp-ui-dialog', className].filter(Boolean).join(' ')}
        open
        ref={dialogRef}
        style={style}
        tabIndex={-1}
      >
        <button aria-label="Close dialog" className="stp-ui-dialog__close" onClick={close} type="button">
          <BiX aria-hidden="true" size={22} />
        </button>
        <div className={['stp-ui-dialog__body', bodyClassName].filter(Boolean).join(' ')} style={bodyStyle}>
          {/* `div`s, not `header` and `footer`: a dialog adds no second banner or content-info landmark to the page. */}
          {title ? (
            <div className="stp-ui-dialog__header">
              <h2 className="stp-ui-dialog__title" id={titleId}>
                {title}
              </h2>
              {subtitle ? <p className="stp-ui-dialog__subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
        {actions ? <div className="stp-ui-dialog__actions">{actions}</div> : null}
      </dialog>
    </div>,
    document.body
  );
}
