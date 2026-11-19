import type { ComponentPropsWithRef, FocusEvent, ReactNode } from 'react';
import { useId } from 'react';
import { useKeyboardFocus } from '../focus/keyboard-focus';

type CommonProps = {
  label?: ReactNode;
  labelDetail?: ReactNode;
  message?: ReactNode;
  messageTone?: 'error' | 'success' | 'neutral';
  leading?: ReactNode;
  trailing?: ReactNode;
  rootClassName?: string;
  reserveMessageSpace?: boolean;
};

export type TextFieldProps = CommonProps &
  (
    | ({ multiline?: false } & Omit<ComponentPropsWithRef<'input'>, 'children'>)
    | ({ multiline: true } & Omit<ComponentPropsWithRef<'textarea'>, 'children'>)
  );

/** A labelled text field. Form libraries remain consumers; refs and native handlers pass through. */
export function TextField(props: TextFieldProps) {
  const generatedId = useId();
  const {
    label,
    labelDetail,
    leading,
    message,
    messageTone = 'neutral',
    rootClassName,
    reserveMessageSpace = true,
    trailing,
    // Chooses the element; on the element itself React would warn about an unknown attribute.
    multiline,
    ...controlProps
  } = props;
  const inputId = controlProps.id ?? `stacktape-field-${generatedId}`;
  const messageId = message ? `${inputId}-message` : undefined;
  const className = ['stp-ui-text-field__control', controlProps.className].filter(Boolean).join(' ');
  const describedBy = [controlProps['aria-describedby'], messageId].filter(Boolean).join(' ') || undefined;
  const keyboardFocus = useKeyboardFocus();
  // Only the field itself: a button in `trailing` draws its own focus mark.
  const focusHandlers = {
    onFocus: (event: FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
      keyboardFocus.onFocus();
      controlProps.onFocus?.(event);
    },
    onBlur: (event: FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
      keyboardFocus.onBlur(event);
      controlProps.onBlur?.(event);
    }
  };

  return (
    <div className={['stp-ui-text-field', rootClassName].filter(Boolean).join(' ')}>
      {label ? (
        <label className="stp-ui-text-field__label" htmlFor={inputId}>
          <span>{label}</span>
          {labelDetail ? <span className="stp-ui-text-field__label-detail">{labelDetail}</span> : null}
        </label>
      ) : null}
      <div
        className={[
          'stp-ui-text-field__surface',
          keyboardFocus.isKeyboardFocused && 'stp-ui-text-field__surface--keyboard-focus'
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leading ? <span className="stp-ui-text-field__leading">{leading}</span> : null}
        {multiline ? (
          <textarea
            {...(controlProps as ComponentPropsWithRef<'textarea'>)}
            {...focusHandlers}
            aria-describedby={describedBy}
            className={className}
            id={inputId}
          />
        ) : (
          <input
            {...(controlProps as ComponentPropsWithRef<'input'>)}
            {...focusHandlers}
            aria-describedby={describedBy}
            className={className}
            id={inputId}
          />
        )}
        {trailing ? <span className="stp-ui-text-field__trailing">{trailing}</span> : null}
      </div>
      {reserveMessageSpace || message ? (
        <div className="stp-ui-text-field__message-slot">
          {message ? (
            <span className={`stp-ui-text-field__message stp-ui-text-field__message--${messageTone}`} id={messageId}>
              {message}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
