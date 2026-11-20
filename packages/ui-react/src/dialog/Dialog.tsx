import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
/** How long a dialog counts as opening: its fade-in (`--stp-motion-duration-base`) and the frames its fields settle in. */
const OPENING_MS = 350;

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
  // What had the focus before the dialog opened, read as it renders open: a field inside it with `autoFocus` takes the
  // focus while it mounts, before any effect here runs, and closing would then return the focus to nothing.
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current && typeof document !== 'undefined') {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpenRef.current = open;
  // While it fades in, nothing inside eases from one look to another (`data-opening` in styles.css): the first field's
  // focus border and a select that settles into its first state belong to the dialog's first look, not to a change.
  const [isOpening, setIsOpening] = useState(true);
  useEffect(() => {
    if (!open) {
      setIsOpening(true);
      return undefined;
    }
    const timer = setTimeout(() => setIsOpening(false), OPENING_MS);
    return () => clearTimeout(timer);
  }, [open]);
  // A dialog stays centred while it fills in (a form opened from a link grows as its data arrives), and keeps its top
  // from the person's first click or key press in it: a tab or a choice that changes its height then grows or shrinks
  // it at the bottom, so the tabs and fields above stay under the pointer. It moves up only as far as it must to stay
  // inside the window. A window resize centres it again.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const overlay = dialog?.parentElement;
    if (!open || !dialog || !overlay || typeof ResizeObserver === 'undefined') return undefined;
    let top: number | null = null;
    const place = () => {
      if (top === null) return;
      const inset = Number.parseFloat(getComputedStyle(overlay).paddingTop) || 0;
      top = Math.max(inset, Math.min(top, overlay.clientHeight - inset - dialog.offsetHeight));
      dialog.style.marginTop = `${top - inset}px`;
    };
    const hold = () => {
      if (top !== null) return;
      top = dialog.getBoundingClientRect().top - overlay.getBoundingClientRect().top;
      dialog.style.alignSelf = 'flex-start';
      place();
    };
    const recentre = () => {
      top = null;
      dialog.style.alignSelf = '';
      dialog.style.marginTop = '';
    };
    const observer = new ResizeObserver(place);
    observer.observe(dialog);
    dialog.addEventListener('pointerdown', hold, true);
    dialog.addEventListener('keydown', hold, true);
    window.addEventListener('resize', recentre);
    return () => {
      observer.disconnect();
      dialog.removeEventListener('pointerdown', hold, true);
      dialog.removeEventListener('keydown', hold, true);
      window.removeEventListener('resize', recentre);
    };
  }, [open]);
  const callbacksRef = useRef({ onClose, onOpenChange });
  callbacksRef.current = { onClose, onOpenChange };
  const isInnermost = useLayer(open, 'modal', () => {
    callbacksRef.current.onClose?.();
    callbacksRef.current.onOpenChange(false);
  });
  const isInnermostRef = useRef(isInnermost);
  isInnermostRef.current = isInnermost;
  const bodyRef = useRef<HTMLDivElement>(null);
  // A body that scrolls with no control inside it (a long text to read) takes a Tab stop of its own, so the keyboard
  // can scroll it too.
  const [isScrollRegion, setIsScrollRegion] = useState(false);
  useEffect(() => {
    const body = bodyRef.current;
    if (!open || !body || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () =>
      setIsScrollRegion(body.scrollHeight > body.clientHeight + 1 && !body.querySelector(focusableSelector));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    for (const child of body.children) observer.observe(child);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
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
      } else if (
        !event.shiftKey &&
        // Focus outside the dialog (dropped to the page, say) comes back to its first control, not the page behind it.
        (document.activeElement === last || !dialog.contains(document.activeElement))
      ) {
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
        data-opening={isOpening ? '' : undefined}
        open
        ref={dialogRef}
        style={style}
        tabIndex={-1}
      >
        <button aria-label="Close dialog" className="stp-ui-dialog__close" onClick={close} type="button">
          <BiX aria-hidden="true" size={22} />
        </button>
        <div
          className={['stp-ui-dialog__body', bodyClassName].filter(Boolean).join(' ')}
          ref={bodyRef}
          style={bodyStyle}
          {...(isScrollRegion && {
            tabIndex: 0,
            role: 'region',
            ...(title ? { 'aria-labelledby': titleId } : { 'aria-label': ariaLabel })
          })}
        >
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
