import { useId } from 'react';

export type SegmentedOption = {
  value: string;
  label: string;
  /** A short second line, such as the monthly price difference. */
  note?: string | undefined;
};

/**
 * One row of mutually exclusive choices: native radio buttons drawn as a segmented control, so the keyboard, focus
 * and screen-reader behaviour are the browser's own.
 */
export function Segmented({
  label,
  options,
  value,
  onChange,
  isDisabled = false
}: {
  label: string;
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset
      aria-label={label}
      className={`w-seg${options.some((option) => option.label.length > 18) ? ' is-stacked' : ''}`}
      disabled={isDisabled}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label className={`${checked ? 'is-checked' : ''}${isDisabled ? ' is-disabled' : ''}`} key={option.value}>
            <input
              checked={checked}
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
            {option.note !== undefined && <span className="w-seg-delta">{option.note}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}
