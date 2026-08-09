import type { CSSProperties, ReactNode, Ref } from 'react';
import { useId } from 'react';

export type RadioOption<Value extends string | number = string | number> = {
  label: ReactNode;
  value: Value;
  description?: ReactNode;
  disabled?: boolean;
};

export type RadioGroupProps<Value extends string | number> = {
  options: readonly RadioOption<Value>[];
  value: Value;
  onValueChange: (value: NoInfer<Value>) => void;
  name: string;
  label?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
};

/** A controlled group of native radio inputs that preserves the option value's real type. */
export function RadioGroup<const Value extends string | number>({
  className,
  disabled = false,
  label,
  name,
  onValueChange,
  options,
  orientation = 'vertical',
  ref,
  style,
  value
}: RadioGroupProps<Value>) {
  const generatedId = useId();

  return (
    <fieldset
      className={['stp-ui-radio-group', `stp-ui-radio-group--${orientation}`, className].filter(Boolean).join(' ')}
      disabled={disabled}
      style={style}
    >
      {label ? <legend className="stp-ui-radio-group__legend">{label}</legend> : null}
      <div className="stp-ui-radio-group__options">
        {options.map((option, index) => {
          const optionId = `${name}-${generatedId}-${index}`;
          return (
            <label className="stp-ui-radio" htmlFor={optionId} key={String(option.value)}>
              <input
                checked={value === option.value}
                className="stp-ui-radio__input"
                disabled={option.disabled}
                id={optionId}
                name={name}
                onChange={() => onValueChange(option.value)}
                ref={index === 0 ? ref : undefined}
                type="radio"
                value={option.value}
              />
              <span aria-hidden="true" className="stp-ui-radio__control" />
              <span className="stp-ui-radio__content">
                <span>{option.label}</span>
                {option.description ? <span className="stp-ui-radio__description">{option.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
