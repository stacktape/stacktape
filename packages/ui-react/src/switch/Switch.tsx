import type { ComponentPropsWithRef } from 'react';

export type SwitchProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'onChange' | 'role'> & {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  isBusy?: boolean;
};

/** A compact binary control. `isBusy` locks interaction without making the value look unavailable. */
export function Switch({
  checked,
  className,
  disabled = false,
  isBusy = false,
  label,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <button
      {...props}
      aria-busy={isBusy || undefined}
      aria-checked={checked}
      aria-label={label}
      className={['stp-ui-switch', checked && 'stp-ui-switch--checked', isBusy && 'stp-ui-switch--busy', className]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || isBusy}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" className="stp-ui-switch__thumb" />
    </button>
  );
}
