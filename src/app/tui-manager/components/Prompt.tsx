/** @jsxImportSource @opentui/react */
import type { TuiPrompt, TuiPromptConfirm, TuiPromptSelect, TuiPromptText, TuiSelectOption } from '../types';
import React, { useMemo } from 'react';
import { useKeyboard } from '@opentui/react';
import { SelectInput } from './SelectInput';
import { TextInputCustom } from './TextInputCustom';

type PromptProps = {
  prompt: TuiPrompt;
};

/**
 * Ensure options have unique values for React keys.
 * If duplicates exist, append index to make them unique.
 * Returns a map from unique value -> original value for resolving.
 */
const ensureUniqueOptions = (options: TuiSelectOption[]) => {
  const valueCount = new Map<string, number>();
  const uniqueOptions: TuiSelectOption[] = [];
  const valueMap = new Map<string, string>(); // uniqueValue -> originalValue

  for (const opt of options) {
    const count = valueCount.get(opt.value) || 0;
    valueCount.set(opt.value, count + 1);

    const uniqueValue = count === 0 ? opt.value : `${opt.value}__${count}`;
    uniqueOptions.push({ label: opt.label, value: uniqueValue, description: opt.description });
    valueMap.set(uniqueValue, opt.value);
  }

  return { uniqueOptions, valueMap };
};

const SelectPrompt: React.FC<{ prompt: TuiPromptSelect }> = ({ prompt }) => {
  const { uniqueOptions, valueMap } = useMemo(() => ensureUniqueOptions(prompt.options), [prompt.options]);

  const handleChange = (uniqueValue: string) => {
    // Resolve with the original value, not the unique one
    const originalValue = valueMap.get(uniqueValue) || uniqueValue;
    prompt.resolve(originalValue);
  };

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <text>
        <strong>{prompt.message}</strong>
      </text>
      <box marginTop={1}>
        <SelectInput options={uniqueOptions} onChange={handleChange} />
      </box>
    </box>
  );
};

const ConfirmPrompt: React.FC<{ prompt: TuiPromptConfirm }> = ({ prompt }) => {
  const defaultValue = prompt.defaultValue !== false;
  const suffix = defaultValue ? 'Y/n' : 'y/N';

  useKeyboard((key) => {
    const lower = key.sequence?.toLowerCase();
    if (lower === 'y') {
      prompt.resolve(true);
      return;
    }
    if (lower === 'n') {
      prompt.resolve(false);
      return;
    }
    if (key.name === 'return') {
      prompt.resolve(defaultValue);
    }
  });

  return (
    <box flexDirection="row" marginTop={1} marginBottom={1}>
      <text>
        <strong>{prompt.message} </strong>
      </text>
      <text fg="gray">({suffix})</text>
    </box>
  );
};

const TextPrompt: React.FC<{ prompt: TuiPromptText }> = ({ prompt }) => {
  const handleSubmit = (value: string) => {
    // Use defaultValue if empty string submitted
    const finalValue = value === '' && prompt.defaultValue ? prompt.defaultValue : value;
    prompt.resolve(finalValue);
  };

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <text>
        <strong>{prompt.message}</strong>
      </text>
      {prompt.description && <text fg="gray"> {prompt.description}</text>}
      <text> </text>
      <TextInputCustom placeholder={prompt.placeholder} isPassword={prompt.isPassword} onSubmit={handleSubmit} />
    </box>
  );
};

export const Prompt: React.FC<PromptProps> = ({ prompt }) => {
  switch (prompt.type) {
    case 'select':
      return <SelectPrompt prompt={prompt} />;
    case 'confirm':
      return <ConfirmPrompt prompt={prompt} />;
    case 'text':
      return <TextPrompt prompt={prompt} />;
    default:
      return null;
  }
};
