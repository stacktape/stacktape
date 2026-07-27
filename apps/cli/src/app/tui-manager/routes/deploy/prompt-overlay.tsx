import { createSignal, Show, For, Switch, Match } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import type {
  TuiPrompt,
  TuiPromptConfirm,
  TuiPromptMultiSelect,
  TuiPromptSelect,
  TuiPromptText,
  TuiSelectOption
} from '../../types';
import { createTuiSignal } from '../../context/deploy-state';
import { useTheme } from '../../context/theme';

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

const SelectPrompt = (props: { prompt: TuiPromptSelect }) => {
  const { theme } = useTheme();
  const unique = () => ensureUniqueOptions(props.prompt.options);
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const maxVisible = () => Math.min(unique().uniqueOptions.length, 15);
  const halfWindow = () => Math.floor(maxVisible() / 2);
  const startIndex = () =>
    Math.max(0, Math.min(selectedIndex() - halfWindow(), unique().uniqueOptions.length - maxVisible()));
  const visibleOptions = () => unique().uniqueOptions.slice(startIndex(), startIndex() + maxVisible());

  useKeyboard((key) => {
    const opts = unique().uniqueOptions;
    if (key.name === 'up') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : opts.length - 1));
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => (prev < opts.length - 1 ? prev + 1 : 0));
    } else if (key.name === 'return') {
      const uniqueValue = opts[selectedIndex()].value;
      const originalValue = unique().valueMap.get(uniqueValue) || uniqueValue;
      props.prompt.resolve(originalValue);
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column">
      <text fg={theme.textBright}>
        <b>{props.prompt.message}</b>
      </text>
      <box height={1} />
      <Show when={startIndex() > 0}>
        <text fg={theme.pending}> ^ {startIndex()} more above</text>
      </Show>
      <For each={visibleOptions()}>
        {(opt, i) => {
          const actualIndex = () => startIndex() + i();
          const isSelected = () => actualIndex() === selectedIndex();
          return (
            <box flexDirection="row">
              <text fg={isSelected() ? theme.running : theme.muted}>{isSelected() ? '› ' : '  '}</text>
              <Show when={isSelected()} fallback={<text fg={theme.text}>{opt.label}</text>}>
                <text fg={theme.running}>
                  <b>{opt.label}</b>
                </text>
              </Show>
              <Show when={opt.description}>
                <text fg={theme.pending}> {opt.description}</text>
              </Show>
            </box>
          );
        }}
      </For>
      <Show when={startIndex() + maxVisible() < unique().uniqueOptions.length}>
        <text fg={theme.pending}> v {unique().uniqueOptions.length - startIndex() - maxVisible()} more below</text>
      </Show>
      <box height={1} />
      <text fg={theme.dim}>↑↓ navigate Enter select Esc cancel</text>
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
      for (const v of props.prompt.defaultValues) {
        for (const [uv, ov] of valueMap.entries()) {
          if (ov === v) {
            initial.add(uv);
            break;
          }
        }
      }
      return initial;
    })()
  );

  useKeyboard((key) => {
    const opts = unique().uniqueOptions;
    if (key.name === 'up') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : opts.length - 1));
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => (prev < opts.length - 1 ? prev + 1 : 0));
    } else if (key.name === 'space') {
      const value = opts[selectedIndex()].value;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    } else if (key.name === 'return') {
      const originalValues = Array.from(checked()).map((v) => unique().valueMap.get(v) || v);
      props.prompt.resolve(originalValues);
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column">
      <text fg={theme.textBright}>
        <b>{props.prompt.message}</b>
      </text>
      <box height={1} />
      <For each={unique().uniqueOptions}>
        {(opt, i) => {
          const isSelected = () => i() === selectedIndex();
          const isChecked = () => checked().has(opt.value);
          const checkmark = () => (isChecked() ? '◉' : '○');
          return (
            <box flexDirection="row">
              <text fg={isSelected() ? theme.running : theme.pending}>{isSelected() ? '› ' : '  '}</text>
              <text fg={isChecked() ? theme.success : theme.pending}>{checkmark()} </text>
              <Show when={isSelected()} fallback={<text fg={theme.text}>{opt.label}</text>}>
                <text fg={theme.running}>
                  <b>{opt.label}</b>
                </text>
              </Show>
              <Show when={opt.description}>
                <text fg={theme.pending}> {opt.description}</text>
              </Show>
            </box>
          );
        }}
      </For>
      <box height={1} />
      <text fg={theme.dim}>↑↓ navigate Space toggle Enter confirm Esc cancel</text>
    </box>
  );
};

const ConfirmPrompt = (props: { prompt: TuiPromptConfirm }) => {
  const { theme } = useTheme();

  useKeyboard((key) => {
    if (key.sequence === 'y' || key.sequence === 'Y') {
      props.prompt.resolve(true);
    } else if (key.sequence === 'n' || key.sequence === 'N') {
      props.prompt.resolve(false);
    } else if (key.name === 'return') {
      props.prompt.resolve(props.prompt.defaultValue !== false);
    } else if (key.name === 'escape') {
      props.prompt.reject?.();
    }
  });

  const defaultHint = () => (props.prompt.defaultValue === false ? 'y/N' : 'Y/n');

  return (
    <box flexDirection="row">
      <text fg={theme.textBright}>
        <b>{props.prompt.message}</b>
      </text>
      <text fg={theme.pending}> ({defaultHint()}) </text>
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
    <box flexDirection="column">
      <box flexDirection="row">
        <text fg={theme.textBright}>
          <b>{props.prompt.message}</b>
        </text>
        <Show when={props.prompt.description}>
          <text fg={theme.pending}> {props.prompt.description}</text>
        </Show>
      </box>
      <box flexDirection="row">
        <text fg={theme.running}>{'> '}</text>
        <text fg={theme.textBright}>{displayValue() || ''}</text>
        <text fg={theme.running}>█</text>
        <Show when={!value() && props.prompt.placeholder}>
          <text fg={theme.dim}> {props.prompt.placeholder}</text>
        </Show>
      </box>
      <box height={1} />
      <text fg={theme.dim}>Enter submit Esc cancel</text>
    </box>
  );
};

const PromptRouter = (props: { prompt: TuiPrompt }) => {
  return (
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
  );
};

export const PromptOverlay = () => {
  const { theme } = useTheme();
  const activePrompt = createTuiSignal((s) => s.activePrompt);

  return (
    <Show when={activePrompt()}>
      {(prompt) => (
        <box flexDirection="column" borderStyle="single" borderColor={theme.running} paddingX={1} paddingY={1}>
          <PromptRouter prompt={prompt()} />
        </box>
      )}
    </Show>
  );
};
