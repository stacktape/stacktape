import type { CSSProperties, ReactNode, Ref } from 'react';
import type {
  ActionMeta,
  ControlProps,
  SingleValueProps,
  InputActionMeta,
  MenuPlacement,
  OptionProps,
  SelectInstance,
  StylesConfig,
  Theme
} from 'react-select';
import ReactSelect, { components, createFilter } from 'react-select';
import { createContext, useContext, useMemo } from 'react';
import { BiCheck } from 'react-icons/bi';
import { Tooltip } from '../tooltip/Tooltip';

export type SelectInputActionMeta = InputActionMeta;
export type SelectMenuPlacement = MenuPlacement;

export type SelectOption<Value = string | number> = {
  label: ReactNode;
  /** Plain text for filtering options whose visual label contains React elements. */
  searchText?: string;
  value: Value;
  /** A shorter form for the closed control ("🇮🇪 eu-west-1"), when the menu label carries more ("… Europe (Ireland)"). */
  valueLabel?: ReactNode;
  /** A muted second line under the label in the menu, such as where a repository lives. */
  description?: ReactNode;
  /** Shown in a 20px slot centred on the whole row (one or two lines); size the icon 18-20px. */
  icon?: ReactNode;
  isDisabled?: boolean;
  isProminent?: boolean;
};

export type SelectValue<Value> = SelectOption<Value> | readonly SelectOption<Value>[] | null;

export type SelectProps<Value> = {
  name: string;
  options: readonly SelectOption<Value>[];
  value?: SelectValue<Value>;
  defaultValue?: SelectValue<Value>;
  onChange?: (value: SelectValue<Value>, action: ActionMeta<SelectOption<Value>>) => void;
  onBlur?: () => void;
  label?: ReactNode;
  labelDetail?: ReactNode;
  labelAddon?: ReactNode;
  labelEnd?: ReactNode;
  required?: boolean;
  hideLabel?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  /** Why the select is disabled, shown on hover. A disabled control always says why. */
  disabledReason?: ReactNode;
  loading?: boolean;
  searchable?: boolean;
  placeholder?: string;
  noOptionsMessage?: ReactNode;
  message?: ReactNode;
  /** Help text reads neutral; validation errors pass `error`, the same tones as `TextField`. */
  messageTone?: 'error' | 'success' | 'neutral';
  reserveMessageSpace?: boolean;
  className?: string;
  style?: CSSProperties;
  width?: CSSProperties['width'];
  leading?: ReactNode;
  /**
   * A muted name drawn inside the control before its value ("Region  eu-west-1"), for selects in a toolbar where a
   * label above would not fit. A preselected value alone does not say what the control chooses.
   */
  inlineLabel?: ReactNode;
  menuPlacement?: MenuPlacement;
  minMenuHeight?: number;
  maxMenuHeight?: number;
  menuIsOpen?: boolean;
  inputValue?: string;
  onInputChange?: (value: string, action: SelectInputActionMeta) => void;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  closeMenuOnSelect?: boolean;
  hideSelectedOptions?: boolean;
  tabSelectsValue?: boolean;
  blurInputOnSelect?: boolean;
  backspaceRemovesValue?: boolean;
  hideDropdownIndicator?: boolean;
  breakOptionWord?: boolean;
  optionHeight?: number | string | undefined;
  /** Defaults to the shared control height (`--stp-control-height`). */
  controlHeight?: number | string;
  cursor?: CSSProperties['cursor'];
  inputRef?: Ref<SelectInstance<SelectOption<Value>, boolean>>;
  form?: string;
};

type SelectPresentation = {
  breakOptionWord: boolean;
  leading?: ReactNode;
  inlineLabel?: ReactNode;
  optionHeight?: number | string | undefined;
};

const SelectPresentationContext = createContext<SelectPresentation>({ breakOptionWord: false });

const filterSelectOption = createFilter<SelectOption<unknown>>({
  stringify: ({ data, label, value }) => `${data.searchText ?? label} ${value}`
});

function SelectControl<Value>(controlProps: ControlProps<SelectOption<Value>, boolean>) {
  const { leading, inlineLabel } = useContext(SelectPresentationContext);
  return (
    <components.Control {...controlProps}>
      {leading ? <span className="stp-ui-select__leading">{leading}</span> : null}
      {inlineLabel ? (
        <span className="stp-ui-select__inline-label" aria-hidden="true">
          {inlineLabel}
        </span>
      ) : null}
      {controlProps.children}
    </components.Control>
  );
}

function SelectSingleValue<Value>(singleValueProps: SingleValueProps<SelectOption<Value>, boolean>) {
  const option = singleValueProps.data;
  return <components.SingleValue {...singleValueProps}>{option.valueLabel ?? option.label}</components.SingleValue>;
}

function SelectOptionComponent<Value>(optionProps: OptionProps<SelectOption<Value>, boolean>) {
  const { breakOptionWord, optionHeight } = useContext(SelectPresentationContext);
  const option = optionProps.data;
  return (
    <components.Option {...optionProps}>
      <span
        className={[
          'stp-ui-select__option-content',
          option.isProminent && 'stp-ui-select__option-content--prominent',
          option.description != null && 'stp-ui-select__option-content--two-line',
          breakOptionWord && 'stp-ui-select__option-content--break'
        ]
          .filter(Boolean)
          .join(' ')}
        style={optionHeight ? { minHeight: optionHeight } : undefined}
      >
        {option.icon ? <span className="stp-ui-select__option-icon">{option.icon}</span> : null}
        <span className="stp-ui-select__option-text">
          <span className="stp-ui-select__option-label">{option.label}</span>
          {option.description != null ? (
            <span className="stp-ui-select__option-description">{option.description}</span>
          ) : null}
        </span>
        {/* The chosen option: bold, filled and checked, the same three marks every menu uses. */}
        {optionProps.isSelected ? <BiCheck aria-hidden className="stp-ui-select__option-check" size={16} /> : null}
      </span>
    </components.Option>
  );
}

/**
 * The shared enhanced select. It owns react-select integration, keyboard/menu behavior and visual
 * recipes; form-library controllers and product-specific option construction stay in consumers.
 */
export function Select<Value>({
  backspaceRemovesValue,
  blurInputOnSelect,
  breakOptionWord = false,
  className,
  closeMenuOnSelect,
  controlHeight = 'var(--stp-control-height, 35px)',
  cursor = 'pointer',
  defaultValue,
  disabled = false,
  disabledReason,
  form,
  hideDropdownIndicator = false,
  hideLabel = false,
  hideSelectedOptions,
  inputRef,
  inputValue,
  inlineLabel,
  label,
  labelAddon,
  labelDetail,
  labelEnd,
  leading,
  loading = false,
  maxMenuHeight,
  menuIsOpen,
  menuPlacement = 'auto',
  message,
  messageTone = 'error',
  minMenuHeight,
  multiple = false,
  name,
  noOptionsMessage,
  onBlur,
  onChange,
  onInputChange,
  onMenuClose,
  onMenuOpen,
  optionHeight,
  options,
  placeholder = 'Select a value',
  reserveMessageSpace = true,
  required = false,
  searchable = true,
  style,
  tabSelectsValue,
  value,
  width
}: SelectProps<Value>) {
  const selectComponents = useMemo(
    () => ({
      Control: SelectControl<Value>,
      Option: SelectOptionComponent<Value>,
      SingleValue: SelectSingleValue<Value>
    }),
    []
  );
  const presentation = useMemo(
    () => ({ breakOptionWord, inlineLabel, leading, optionHeight }),
    [breakOptionWord, inlineLabel, leading, optionHeight]
  );
  const styles = useMemo(
    () =>
      createStyles<Value>({
        controlHeight,
        cursor,
        hasLeading: !!leading || !!inlineLabel,
        hideDropdownIndicator,
        multiple,
        searchable
      }),
    [controlHeight, cursor, leading, inlineLabel, hideDropdownIndicator, multiple, searchable]
  );

  const select = (
    <div className={['stp-ui-select', className].filter(Boolean).join(' ')} style={{ width, ...style }}>
      {!hideLabel && (label || labelAddon || labelEnd) ? (
        <div className="stp-ui-select__label-row">
          <label className="stp-ui-select__label" htmlFor={`${name}-input`}>
            {label}
            {labelDetail ? <span className="stp-ui-select__label-detail">{labelDetail}</span> : null}
            {required ? <span aria-hidden="true">*</span> : null}
            {labelAddon}
          </label>
          {labelEnd}
        </div>
      ) : null}
      <SelectPresentationContext.Provider value={presentation}>
        <ReactSelect<SelectOption<Value>, boolean>
          {...(backspaceRemovesValue === undefined ? {} : { backspaceRemovesValue })}
          {...(blurInputOnSelect === undefined ? {} : { blurInputOnSelect })}
          classNamePrefix="stp-select"
          {...(closeMenuOnSelect === undefined ? {} : { closeMenuOnSelect })}
          components={selectComponents}
          filterOption={filterSelectOption}
          {...(defaultValue === undefined ? {} : { defaultValue })}
          {...(form === undefined ? {} : { form })}
          {...(hideSelectedOptions === undefined ? {} : { hideSelectedOptions })}
          inputId={`${name}-input`}
          // A select whose visible label is hidden (a page header's account picker) still announces its name.
          {...(hideLabel && typeof label === 'string' ? { 'aria-label': label } : {})}
          {...(inputValue === undefined ? {} : { inputValue })}
          isDisabled={disabled || loading}
          isLoading={loading}
          isMulti={multiple}
          isSearchable={searchable}
          loadingMessage={() => null}
          {...(maxMenuHeight === undefined ? {} : { maxMenuHeight })}
          {...(menuIsOpen === undefined ? {} : { menuIsOpen })}
          menuPlacement={menuPlacement}
          {...(typeof document === 'undefined' ? {} : { menuPortalTarget: document.body })}
          menuPosition="fixed"
          {...(minMenuHeight === undefined ? {} : { minMenuHeight })}
          name={name}
          noOptionsMessage={() => noOptionsMessage ?? 'No options available.'}
          {...(onBlur === undefined ? {} : { onBlur })}
          onChange={(selection, action) => onChange?.(selection as SelectValue<Value>, action)}
          {...(onInputChange === undefined ? {} : { onInputChange })}
          {...(onMenuClose === undefined ? {} : { onMenuClose })}
          {...(onMenuOpen === undefined ? {} : { onMenuOpen })}
          options={options}
          placeholder={placeholder}
          {...(inputRef === undefined ? {} : { ref: inputRef })}
          styles={styles}
          {...(tabSelectsValue === undefined ? {} : { tabSelectsValue })}
          theme={neutralTheme}
          {...(value === undefined ? {} : { value })}
        />
      </SelectPresentationContext.Provider>
      {reserveMessageSpace || message ? (
        <div className="stp-ui-select__message-slot">
          {message ? (
            <span className={`stp-ui-select__message stp-ui-select__message--${messageTone}`}>{message}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
  // react-select stops pointer events on a disabled control, so the tooltip listens on a wrapper.
  return disabled && disabledReason ? (
    <Tooltip content={disabledReason}>
      <div className="stp-ui-select__disabled-wrapper" style={{ width, ...style }}>
        {select}
      </div>
    </Tooltip>
  ) : (
    select
  );
}

/**
 * react-select's own theme is blue (`#2684FF` focus and hover borders, light-blue option presses). Every colour the
 * styles below do not set falls back to this theme, so it holds palette neutrals instead.
 */
/** The secondary button's rest and hover shadows (`.stp-ui-button--secondary`), for selects drawn as buttons. */
const BUTTON_SHADOW_REST = '0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.09)';
const BUTTON_SHADOW_RAISED = '0 3px 9px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.12)';

const neutralTheme = (theme: Theme): Theme => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: 'var(--stp-field-focus-border)',
    primary75: 'var(--stp-field-focus-border)',
    primary50: 'rgba(255, 255, 255, 0.09)',
    primary25: 'rgba(255, 255, 255, 0.05)'
  }
});

function createStyles<Value>({
  controlHeight,
  cursor,
  hasLeading,
  hideDropdownIndicator,
  multiple,
  searchable
}: {
  controlHeight: number | string;
  cursor: CSSProperties['cursor'];
  hasLeading: boolean;
  hideDropdownIndicator: boolean;
  multiple: boolean;
  searchable: boolean;
}): StylesConfig<SelectOption<Value>, boolean> {
  // A select you can type into is a field: recessed, like a text input. One you can only open is a button that opens
  // a menu, so it wears the secondary button's surface and its rest, hover and focus shadows (the time range picker
  // does the same).
  const isButton = !searchable && !multiple;
  return {
    clearIndicator: (base) => ({
      ...base,
      color: 'var(--stp-text-muted)',
      cursor: 'pointer',
      padding: 5,
      ':hover': { color: 'var(--stp-text-primary)' }
    }),
    container: (base) => ({ ...base, color: 'var(--stp-text-primary)' }),
    control: (base, state) => ({
      ...base,
      minHeight: controlHeight,
      height: multiple ? undefined : controlHeight,
      // Content starts 14px in, where a text field's does, so icons, values and inset labels share one line.
      padding: '0 6px 0 14px',
      // One border recipe with `TextField`: `--stp-field-border` is a colour there, so it is one here.
      // Longhands, because react-select's base already holds `borderColor` and spreading it first keeps
      // that key's position, so a `border` shorthand written here would land after it and reset it.
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: isButton
        ? 'transparent'
        : state.isFocused
          ? 'var(--stp-field-border-focus, var(--stp-field-focus-border))'
          : 'var(--stp-field-border, var(--stp-border-subtle))',
      borderRadius: 'var(--stp-field-radius, var(--stp-radius-large))',
      background: isButton ? 'var(--stp-control-surface)' : 'var(--stp-field-background, var(--stp-surface-input))',
      boxShadow: isButton
        ? state.isFocused
          ? `${BUTTON_SHADOW_RAISED}, 0 0 0 3px var(--stp-field-focus-ring)`
          : BUTTON_SHADOW_REST
        : state.isFocused
          ? 'var(--stp-field-shadow-focus, inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 3px var(--stp-field-focus-ring))'
          : 'var(--stp-field-shadow, inset 0 1px 3px rgba(0, 0, 0, 0.3))',
      cursor: state.isDisabled ? 'not-allowed' : cursor,
      // The same disabled look as `TextField`.
      opacity: state.isDisabled ? 0.6 : 1,
      transition:
        'border-color var(--stp-motion-duration-fast) var(--stp-motion-easing), box-shadow var(--stp-motion-duration-fast) var(--stp-motion-easing)',
      // Hover never replaces the focus border: a focused control keeps its ring under the pointer. The key is
      // `&:hover`, react-select's own, so this replaces its blue hover border instead of adding a second rule.
      '&:hover': isButton
        ? {
            borderColor: 'transparent',
            boxShadow: state.isFocused
              ? `${BUTTON_SHADOW_RAISED}, 0 0 0 3px var(--stp-field-focus-ring)`
              : BUTTON_SHADOW_RAISED
          }
        : {
            borderColor: state.isFocused
              ? 'var(--stp-field-border-focus, var(--stp-field-focus-border))'
              : 'var(--stp-field-border-hover, var(--stp-field-hover-border))'
          }
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      display: hideDropdownIndicator ? 'none' : 'flex',
      color: state.isDisabled ? 'var(--stp-text-faint)' : 'var(--stp-text-primary)',
      padding: 6,
      // The chevron belongs to the control and has no hover of its own (react-select greys it).
      ':hover': { color: 'var(--stp-text-primary)' }
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    input: (base) => ({ ...base, color: 'var(--stp-text-primary)', margin: 0, paddingLeft: 0 }),
    menu: (base) => ({
      ...base,
      zIndex: 10001,
      // As wide as the longest option (within reason), so a long project name in a 200px filter stays on one line.
      width: 'max-content',
      minWidth: '100%',
      maxWidth: 'min(var(--stp-menu-max-width), var(--stp-select-menu-max-width, 100vw))',
      // The shared menu surface and gap (`--stp-menu-*` in styles.css), the same as every other menu.
      marginBlock: 'var(--stp-menu-gap)',
      padding: 'var(--stp-menu-padding)',
      overflow: 'hidden',
      border: 'var(--stp-menu-border)',
      borderRadius: 'var(--stp-menu-radius)',
      background: 'var(--stp-menu-background)',
      boxShadow: 'var(--stp-menu-shadow)'
    }),
    menuList: (base) => ({ ...base, padding: 0, color: 'var(--stp-text-primary)' }),
    // The menu may be wider than its control, but never past the window's right edge.
    menuPortal: (base, { rect }) => ({
      ...base,
      zIndex: 10001,
      ['--stp-select-menu-max-width' as string]:
        typeof window === 'undefined' ? undefined : `${Math.max(rect.width, window.innerWidth - rect.left - 12)}px`
    }),
    multiValue: (base) => ({
      ...base,
      margin: '1px 3px',
      borderRadius: 'var(--stp-radius-small)',
      background: 'rgba(255, 255, 255, 0.08)',
      color: 'var(--stp-text-primary)'
    }),
    multiValueLabel: (base) => ({ ...base, color: 'var(--stp-text-primary)' }),
    multiValueRemove: (base) => ({
      ...base,
      cursor: 'pointer',
      ':hover': { background: 'rgba(235, 97, 97, 0.14)', color: 'var(--stp-status-error)' }
    }),
    noOptionsMessage: (base) => ({ ...base, color: 'var(--stp-text-muted)' }),
    option: (base, state) => ({
      ...base,
      margin: '1px 0',
      padding: 'var(--stp-menu-item-padding)',
      borderRadius: 'var(--stp-menu-item-radius)',
      background: state.isSelected
        ? 'var(--stp-menu-item-selected)'
        : state.isFocused
          ? 'var(--stp-menu-item-hover)'
          : 'transparent',
      color: 'var(--stp-text-primary)',
      // The chosen option differs from the hovered one by weight as well as by fill.
      fontWeight: state.isSelected ? 700 : undefined,
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      // A press keeps the hover fill instead of react-select's light-blue flash.
      ':active': { background: state.isSelected ? 'var(--stp-menu-item-selected)' : 'var(--stp-menu-item-hover)' }
    }),
    placeholder: (base) => ({ ...base, marginLeft: 0, color: 'var(--stp-text-faint)' }),
    singleValue: (base) => ({ ...base, marginLeft: 0, color: 'var(--stp-text-primary)' }),
    // Flush with the control's inset; after an icon or inline label, the same 8px gap a text field leaves.
    valueContainer: (base) => ({ ...base, padding: hasLeading ? '1px 2px 1px 8px' : '1px 2px 1px 0' })
  };
}
