import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useId } from 'react';

export type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'children' | 'type'> & {
  label: ReactNode;
  description?: ReactNode;
};

/** A native checkbox with a visible Stacktape control and an entire-row click target. */
export function Checkbox({ className, description, id, label, ...inputProps }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? `stacktape-checkbox-${generatedId}`;

  return (
    <label className={['stp-ui-checkbox', className].filter(Boolean).join(' ')} htmlFor={inputId}>
      <input {...inputProps} className="stp-ui-checkbox__input" id={inputId} type="checkbox" />
      <span aria-hidden="true" className="stp-ui-checkbox__control">
        <svg height="10" viewBox="0 0 12 10" width="12">
          <polyline points="1.5 6 4.5 9 10.5 1" />
        </svg>
      </span>
      <span className="stp-ui-checkbox__content">
        <span className="stp-ui-checkbox__label">{label}</span>
        {description ? <span className="stp-ui-checkbox__description">{description}</span> : null}
      </span>
    </label>
  );
}
