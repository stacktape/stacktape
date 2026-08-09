import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useId } from 'react';

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
    ...controlProps
  } = props;
  const inputId = controlProps.id ?? `stacktape-field-${generatedId}`;
  const messageId = message ? `${inputId}-message` : undefined;
  const className = ['stp-ui-text-field__control', controlProps.className].filter(Boolean).join(' ');
  const describedBy = [controlProps['aria-describedby'], messageId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['stp-ui-text-field', rootClassName].filter(Boolean).join(' ')}>
      {label ? (
        <label className="stp-ui-text-field__label" htmlFor={inputId}>
          <span>{label}</span>
          {labelDetail ? <span className="stp-ui-text-field__label-detail">{labelDetail}</span> : null}
        </label>
      ) : null}
      <div className="stp-ui-text-field__surface">
        {leading ? <span className="stp-ui-text-field__leading">{leading}</span> : null}
        {props.multiline ? (
          <textarea
            {...(controlProps as ComponentPropsWithRef<'textarea'>)}
            aria-describedby={describedBy}
            className={className}
            id={inputId}
          />
        ) : (
          <input
            {...(controlProps as ComponentPropsWithRef<'input'>)}
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
