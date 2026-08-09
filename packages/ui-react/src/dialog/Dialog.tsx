import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BiX } from 'react-icons/bi';

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

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog with focus containment, focus restoration, Escape handling and scroll locking.
 * Product-specific forms and confirmation flows compose this primitive instead of reimplementing it.
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

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const focusFrame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      (dialog?.querySelector<HTMLElement>(focusableSelector) ?? dialog)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        callbacksRef.current.onClose?.();
        callbacksRef.current.onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab') return;

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
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
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
      >
        <button aria-label="Close dialog" className="stp-ui-dialog__close" onClick={close} type="button">
          <BiX aria-hidden="true" size={28} />
        </button>
        <div className={['stp-ui-dialog__body', bodyClassName].filter(Boolean).join(' ')} style={bodyStyle}>
          {title ? (
            <header className="stp-ui-dialog__header">
              <h2 className="stp-ui-dialog__title" id={titleId}>
                {title}
              </h2>
              {subtitle ? <p className="stp-ui-dialog__subtitle">{subtitle}</p> : null}
            </header>
          ) : null}
          {children}
          {actions ? <footer className="stp-ui-dialog__actions">{actions}</footer> : null}
        </div>
      </dialog>
    </div>,
    document.body
  );
}
