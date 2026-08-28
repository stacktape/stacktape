import type { SelectOption } from '@opentui/core';
import { useKeyboard } from '@opentui/solid';
import { createSignal, For, Match, Show, Switch } from 'solid-js';
import { interactionCoordinator } from '../../interaction/coordinator';
import type { TuiPrompt, TuiPromptConfirm, TuiPromptMultiSelect, TuiPromptSelect, TuiPromptText } from '../types';
import { glyphs } from '../../ui/glyphs';
import { useTheme } from '../../ui/theme';
import { registerSecureInput } from './secure-input';

registerSecureInput();

export type PromptHint = { key: string; label: string };

export const promptHints = (prompt: TuiPrompt): PromptHint[] => {
  if (prompt.type === 'multiSelect') {
    return [
      { key: '↑↓', label: 'choose' },
      { key: 'space', label: 'toggle' },
      { key: 'enter', label: 'confirm' },
      { key: 'esc', label: 'cancel' }
    ];
  }
  return [
    { key: prompt.type === 'text' ? 'type' : '↑↓', label: prompt.type === 'text' ? 'edit' : 'choose' },
    { key: 'enter', label: 'confirm' },
    { key: 'esc', label: 'cancel' }
  ];
};

const PromptFrame = (props: { title: string; description?: string; children: unknown }) => {
  const { theme } = useTheme();
  return (
    <box
      flexDirection="column"
      width="70%"
      maxWidth={72}
      minWidth={36}
      border
      borderColor={theme.running}
      backgroundColor={theme.bg}
      paddingX={2}
      paddingY={1}
    >
      <text fg={theme.textBright} wrapMode="word">
        <b>{props.title}</b>
      </text>
      <Show when={props.description}>
        <text fg={theme.muted} wrapMode="word">
          {props.description}
        </text>
      </Show>
      <box height={1} />
      {props.children}
      <box height={1} />
      <text fg={theme.dim}>esc cancel</text>
    </box>
  );
};

const SelectPrompt = (props: { prompt: TuiPromptSelect }) => {
  const { theme } = useTheme();
  const options = (): SelectOption[] =>
    props.prompt.options.map((option) => ({
      name: option.label,
      description: option.description ?? '',
      value: option.value
    }));
  const initial = () =>
    Math.max(
      0,
      props.prompt.options.findIndex((option) => option.value === props.prompt.defaultValue)
    );

  return (
    <PromptFrame title={props.prompt.message}>
      {/* OpenTUI controls are terminal renderables; the surrounding PromptFrame is their visible label. */}
      {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
      <select
        focused
        height={Math.min(12, Math.max(3, props.prompt.options.length * 2))}
        options={options()}
        selectedIndex={initial()}
        wrapSelection
        showDescription
        textColor={theme.text}
        focusedTextColor={theme.textBright}
        selectedTextColor={theme.textBright}
        selectedBackgroundColor={theme.border}
        descriptionColor={theme.muted}
        selectedDescriptionColor={theme.muted}
        onSelect={(_index, option) => {
          if (option) interactionCoordinator.answerPrompt(props.prompt.id, option.value);
        }}
      />
    </PromptFrame>
  );
};

const MultiSelectPrompt = (props: { prompt: TuiPromptMultiSelect }) => {
  const { theme } = useTheme();
  const [index, setIndex] = createSignal(0);
  const [selected, setSelected] = createSignal(new Set(props.prompt.defaultValues ?? []));

  useKeyboard((key) => {
    if (key.name === 'escape') return interactionCoordinator.cancelPrompt(props.prompt.id);
    if (key.name === 'up') setIndex((value) => (value <= 0 ? props.prompt.options.length - 1 : value - 1));
    if (key.name === 'down') setIndex((value) => (value + 1) % props.prompt.options.length);
    if (key.name === 'space') {
      const value = props.prompt.options[index()]?.value;
      if (!value) return;
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    }
    if (key.name === 'return') interactionCoordinator.answerPrompt(props.prompt.id, [...selected()]);
  });

  return (
    <PromptFrame title={props.prompt.message} description={`${selected().size} selected`}>
      <box flexDirection="column">
        <For each={props.prompt.options}>
          {(option, optionIndex) => (
            <box height={1} flexDirection="row">
              <text fg={optionIndex() === index() ? theme.running : theme.dim}>
                {optionIndex() === index() ? glyphs.selected : ' '}{' '}
              </text>
              <text fg={selected().has(option.value) ? theme.success : theme.dim}>
                {selected().has(option.value) ? glyphs.success : glyphs.pending}{' '}
              </text>
              <text fg={optionIndex() === index() ? theme.textBright : theme.text}>{option.label}</text>
              <Show when={option.description}>
                <text fg={theme.muted}> {option.description}</text>
              </Show>
            </box>
          )}
        </For>
      </box>
    </PromptFrame>
  );
};

const ConfirmPrompt = (props: { prompt: TuiPromptConfirm }) => {
  const { theme } = useTheme();
  const [choice, setChoice] = createSignal(props.prompt.defaultValue === false ? 1 : 0);
  useKeyboard((key) => {
    if (key.name === 'escape') return interactionCoordinator.cancelPrompt(props.prompt.id);
    if (key.sequence?.toLowerCase() === 'y') return interactionCoordinator.answerPrompt(props.prompt.id, true);
    if (key.sequence?.toLowerCase() === 'n') return interactionCoordinator.answerPrompt(props.prompt.id, false);
    if (key.name === 'up' || key.name === 'down') setChoice((value) => (value === 0 ? 1 : 0));
    if (key.name === 'return') interactionCoordinator.answerPrompt(props.prompt.id, choice() === 0);
  });
  return (
    <PromptFrame title={props.prompt.message}>
      <For each={['Yes', 'No']}>
        {(label, index) => (
          <text fg={choice() === index() ? theme.textBright : theme.muted}>
            {choice() === index() ? glyphs.selected : ' '} {label}
          </text>
        )}
      </For>
    </PromptFrame>
  );
};

const TextPrompt = (props: { prompt: TuiPromptText }) => {
  const { theme } = useTheme();
  const initialValue =
    (props.prompt.isPassword
      ? interactionCoordinator.getSensitiveDefault(props.prompt.id)
      : props.prompt.defaultValue) ?? '';
  const [value, setValue] = createSignal(initialValue);

  useKeyboard((key) => {
    if (key.name === 'escape') interactionCoordinator.cancelPrompt(props.prompt.id);
  });

  return (
    <PromptFrame title={props.prompt.message} description={props.prompt.description}>
      <Show when={props.prompt.isPassword}>
        <text fg={theme.text}>{'•'.repeat(value().length) || ' '}</text>
      </Show>
      <Show
        when={props.prompt.isPassword}
        fallback={
          <input
            focused
            value={initialValue}
            placeholder={props.prompt.placeholder ?? ''}
            textColor={theme.textBright}
            focusedTextColor={theme.textBright}
            cursorColor={theme.running}
            backgroundColor={theme.bg}
            onInput={setValue}
            onSubmit={(submitted) => interactionCoordinator.answerPrompt(props.prompt.id, submitted)}
          />
        }
      >
        <secure_input
          focused
          value={initialValue}
          placeholder=""
          textColor={theme.textBright}
          focusedTextColor={theme.textBright}
          cursorColor={theme.running}
          backgroundColor={theme.bg}
          focusedBackgroundColor={theme.bg}
          onInput={setValue}
          onSubmit={(submitted) => interactionCoordinator.answerPrompt(props.prompt.id, submitted)}
        />
      </Show>
    </PromptFrame>
  );
};

export const PromptBlock = (props: { prompt: TuiPrompt }) => (
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
