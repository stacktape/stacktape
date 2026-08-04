import { createSignal, Show, For, Switch, Match, type JSX } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import type { TuiPrompt, TuiPromptConfirm, TuiPromptMultiSelect, TuiPromptSelect, TuiPromptText } from '../types';
import type { TuiSelectOption } from '../../types';
import { glyphs } from '../../ui/glyphs';
import { useTheme } from '../../ui/theme';

export type PromptHint = { key: string; label: string };

/** Hints shown in the footer hint row while a prompt is active. */
export const promptHints = (prompt: TuiPrompt): PromptHint[] => {
  switch (prompt.type) {
    case 'confirm':
      return [
        { key: 'y', label: 'yes' },
        { key: 'n', label: 'no' },
        { key: 'enter', label: 'confirm' },
        { key: 'esc', label: 'cancel' }
      ];
    case 'select':
      return [
        { key: '↑↓', label: 'choose' },
        { key: 'enter', label: 'select' },
        { key: 'esc', label: 'cancel' }
      ];
    case 'multiSelect':
      return [
        { key: '↑↓', label: 'choose' },
        { key: 'space', label: 'toggle' },
        { key: 'enter', label: 'confirm' },
        { key: 'esc', label: 'cancel' }
      ];
    case 'text':
      return [
        { key: 'enter', label: 'submit' },
        { key: 'esc', label: 'cancel' }
      ];
  }
};

const ensureUniqueOptions = (options: TuiSelectOption[]) => {
  const valueCount = new Map<string, number>();
  const uniqueOptions: TuiSelectOption[] = [];
  const valueMap = new Map<string, string>();

  for (const opt of options) {
    const count = valueCount.get(opt.value) || 0;
    valueCount.set(opt.value, count + 1);
    const uniqueValue = count === 0 ? opt.value : `${opt.value}__${count}`;
    uniqueOptions.push({ label: opt.label, value: uniqueValue, description: opt.description });
    valueMap.set(uniqueValue, opt.value);
  }
  return { uniqueOptions, valueMap };
};

const AccentRow = (props: { children: JSX.Element }) => {
  const { theme } = useTheme();
  return (
    <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
      <text flexShrink={0} wrapMode="none" fg={theme.running}>
        {glyphs.accentBar}
      </text>
      {props.children}
    </box>
  );
};

const MAX_VISIBLE_OPTIONS = 4;

const OptionRow = (props: {
  label: string;
  description?: string;
  selected: boolean;
  checked?: boolean | undefined;
  labelWidth: number;
}) => {
  const { theme } = useTheme();
  return (
    <AccentRow>
      <Show
        when={props.selected}
        fallback={
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {'   '}
          </text>
        }
      >
        <text flexShrink={0} wrapMode="none" fg={theme.running}>
          {' '}
          {glyphs.selected}{' '}
        </text>
      </Show>
      <Show when={props.checked !== undefined}>
        <text flexShrink={0} wrapMode="none" fg={props.checked ? theme.success : theme.dim}>
          {props.checked ? glyphs.success : glyphs.pending}{' '}
        </text>
      </Show>
      <text flexShrink={0} wrapMode="none" fg={props.selected ? theme.textBright : theme.text}>
        <Show when={props.selected} fallback={props.label.padEnd(props.labelWidth)}>
          <b>{props.label.padEnd(props.labelWidth)}</b>
        </Show>
      </text>
      <Show when={props.description}>
        <text flexShrink={1} wrapMode="none" fg={theme.muted}>
          {' '}
          {glyphs.separator} {props.description}
        </text>
      </Show>
    </AccentRow>
  );
};

const SelectPrompt = (props: { prompt: TuiPromptSelect }) => {
  const { theme } = useTheme();
  const unique = () => ensureUniqueOptions(props.prompt.options);
  const initialIndex = () => {
    if (props.prompt.defaultValue === undefined) return 0;
    const index = props.prompt.options.findIndex((o) => o.value === props.prompt.defaultValue);
    return index >= 0 ? index : 0;
  };
  const [selectedIndex, setSelectedIndex] = createSignal(initialIndex());

  const total = () => unique().uniqueOptions.length;
  const windowSize = () => Math.min(total(), MAX_VISIBLE_OPTIONS);
  const startIndex = () =>
    Math.max(0, Math.min(selectedIndex() - Math.floor(windowSize() / 2), total() - windowSize()));
  const visibleOptions = () => unique().uniqueOptions.slice(startIndex(), startIndex() + windowSize());
  const labelWidth = () => Math.min(24, Math.max(...visibleOptions().map((o) => o.label.length), 1));

  useKeyboard((key) => {
    if (key.name === 'up') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : total() - 1));
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => (prev < total() - 1 ? prev + 1 : 0));
    } else if (key.name === 'return') {
      const uniqueValue = unique().uniqueOptions[selectedIndex()].value;
      props.prompt.resolve(unique().valueMap.get(uniqueValue) || uniqueValue);
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column" overflow="hidden">
      <AccentRow>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {' '}
          <b>{props.prompt.message}</b>
        </text>
        <box flexGrow={1} />
        <Show when={total() > windowSize()}>
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {selectedIndex() + 1} of {total()}
          </text>
        </Show>
      </AccentRow>
      <AccentRow>
        <text> </text>
      </AccentRow>
      <For each={visibleOptions()}>
        {(opt, i) => (
          <OptionRow
            label={opt.label}
            description={opt.description}
            selected={startIndex() + i() === selectedIndex()}
            labelWidth={labelWidth()}
          />
        )}
      </For>
    </box>
  );
};

const MultiSelectPrompt = (props: { prompt: TuiPromptMultiSelect }) => {
  const { theme } = useTheme();
  const unique = () => ensureUniqueOptions(props.prompt.options);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [checked, setChecked] = createSignal<Set<string>>(
    (() => {
      if (!props.prompt.defaultValues) return new Set<string>();
      const initial = new Set<string>();
      const { valueMap } = ensureUniqueOptions(props.prompt.options);
      for (const value of props.prompt.defaultValues) {
        for (const [uniqueValue, originalValue] of valueMap.entries()) {
          if (originalValue === value) {
            initial.add(uniqueValue);
            break;
          }
        }
      }
      return initial;
    })()
  );

  const total = () => unique().uniqueOptions.length;
  const windowSize = () => Math.min(total(), MAX_VISIBLE_OPTIONS);
  const startIndex = () =>
    Math.max(0, Math.min(selectedIndex() - Math.floor(windowSize() / 2), total() - windowSize()));
  const visibleOptions = () => unique().uniqueOptions.slice(startIndex(), startIndex() + windowSize());
  const labelWidth = () => Math.min(24, Math.max(...visibleOptions().map((o) => o.label.length), 1));

  useKeyboard((key) => {
    if (key.name === 'up') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : total() - 1));
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => (prev < total() - 1 ? prev + 1 : 0));
    } else if (key.name === 'space') {
      const value = unique().uniqueOptions[selectedIndex()].value;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    } else if (key.name === 'return') {
      props.prompt.resolve(Array.from(checked()).map((v) => unique().valueMap.get(v) || v));
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column" overflow="hidden">
      <AccentRow>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {' '}
          <b>{props.prompt.message}</b>
        </text>
        <box flexGrow={1} />
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {checked().size} selected
          <Show when={total() > windowSize()}>
            {' '}
            {glyphs.separator} {selectedIndex() + 1} of {total()}
          </Show>
        </text>
      </AccentRow>
      <AccentRow>
        <text> </text>
      </AccentRow>
      <For each={visibleOptions()}>
        {(opt, i) => (
          <OptionRow
            label={opt.label}
            description={opt.description}
            selected={startIndex() + i() === selectedIndex()}
            checked={checked().has(opt.value)}
            labelWidth={labelWidth()}
          />
        )}
      </For>
    </box>
  );
};

const ConfirmPrompt = (props: { prompt: TuiPromptConfirm }) => {
  const { theme } = useTheme();
  const [choice, setChoice] = createSignal(props.prompt.defaultValue === false ? 1 : 0);

  useKeyboard((key) => {
    if (key.sequence === 'y' || key.sequence === 'Y') {
      props.prompt.resolve(true);
    } else if (key.sequence === 'n' || key.sequence === 'N') {
      props.prompt.resolve(false);
    } else if (key.name === 'up' || key.name === 'down') {
      setChoice((prev) => (prev === 0 ? 1 : 0));
    } else if (key.name === 'return') {
      props.prompt.resolve(choice() === 0);
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column" overflow="hidden">
      <AccentRow>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {' '}
          <b>{props.prompt.message}</b>
        </text>
      </AccentRow>
      <AccentRow>
        <text> </text>
      </AccentRow>
      <OptionRow label="Yes" selected={choice() === 0} labelWidth={3} />
      <OptionRow label="No" selected={choice() === 1} labelWidth={3} />
    </box>
  );
};

const TextPrompt = (props: { prompt: TuiPromptText }) => {
  const { theme } = useTheme();
  const [value, setValue] = createSignal(props.prompt.defaultValue || '');

  useKeyboard((key) => {
    if (key.name === 'return') {
      const finalValue = value() === '' && props.prompt.defaultValue ? props.prompt.defaultValue : value();
      props.prompt.resolve(finalValue);
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    } else if (key.name === 'backspace') {
      setValue((prev) => prev.slice(0, -1));
    } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setValue((prev) => prev + key.sequence);
    }
  });

  const displayValue = () => (props.prompt.isPassword ? '•'.repeat(value().length) : value());

  return (
    <box flexDirection="column" overflow="hidden">
      <AccentRow>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {' '}
          <b>{props.prompt.message}</b>
        </text>
      </AccentRow>
      <AccentRow>
        <text flexShrink={0} wrapMode="none" fg={theme.running}>
          {' '}
          {glyphs.selected}{' '}
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {displayValue()}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.running}>
          {glyphs.barFilled}
        </text>
        <Show when={!value() && props.prompt.placeholder}>
          <text flexShrink={1} wrapMode="none" fg={theme.dim}>
            {' '}
            {props.prompt.placeholder}
          </text>
        </Show>
      </AccentRow>
      <Show when={props.prompt.description}>
        <AccentRow>
          <text flexShrink={1} wrapMode="none" fg={theme.muted}>
            {' '}
            {props.prompt.description}
          </text>
        </AccentRow>
      </Show>
    </box>
  );
};

/** Accent-bar prompt block rendered inside the footer's reserved body rows. */
export const PromptBlock = (props: { prompt: TuiPrompt }) => {
  return (
    <box flexDirection="column" paddingLeft={2} overflow="hidden">
      <Switch>
        <Match when={props.prompt.type === 'select'}>
          <SelectPrompt prompt={props.prompt as TuiPromptSelect} />
        </Match>
        <Match when={props.prompt.type === 'multiSelect'}>
          <MultiSelectPrompt prompt={props.prompt as TuiPromptMultiSelect} />
        </Match>
        <Match when={props.prompt.type === 'confirm'}>
          <ConfirmPrompt prompt={props.prompt as TuiPromptConfirm} />
        </Match>
        <Match when={props.prompt.type === 'text'}>
          <TextPrompt prompt={props.prompt as TuiPromptText} />
        </Match>
      </Switch>
    </box>
  );
};
