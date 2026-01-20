import type {
  TuiPrompt,
  TuiPromptConfirm,
  TuiPromptMultiSelect,
  TuiPromptSelect,
  TuiPromptText,
  TuiSelectOption
} from '../types';
import { ConfirmInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { MultiSelectInput } from './MultiSelectInput';
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
    <Box flexDirection="column" marginY={1}>
      <Text bold>{prompt.message}</Text>
      <Box marginTop={1}>
        <SelectInput options={uniqueOptions} onChange={handleChange} />
      </Box>
    </Box>
  );
};

const MultiSelectPrompt: React.FC<{ prompt: TuiPromptMultiSelect }> = ({ prompt }) => {
  const { uniqueOptions, valueMap } = useMemo(() => ensureUniqueOptions(prompt.options), [prompt.options]);

  // Map default values to unique values
  const uniqueDefaultValues = useMemo(() => {
    if (!prompt.defaultValues) return undefined;
    return prompt.defaultValues
      .map((v) => {
        for (const [uniqueVal, origVal] of valueMap.entries()) {
          if (origVal === v) return uniqueVal;
        }
        return v;
      })
      .filter(Boolean);
  }, [prompt.defaultValues, valueMap]);

  const handleChange = (uniqueValues: string[]) => {
    const originalValues = uniqueValues.map((v) => valueMap.get(v) || v);
    prompt.resolve(originalValues);
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>{prompt.message}</Text>
      <Box marginTop={1}>
        <MultiSelectInput options={uniqueOptions} onChange={handleChange} defaultValues={uniqueDefaultValues} />
      </Box>
    </Box>
  );
};

const ConfirmPrompt: React.FC<{ prompt: TuiPromptConfirm }> = ({ prompt }) => {
  return (
    <Box>
      <Text bold>{prompt.message} </Text>
      <Text color="gray">(</Text>
      <ConfirmInput
        defaultChoice={prompt.defaultValue === false ? 'cancel' : 'confirm'}
        submitOnEnter={true}
        onConfirm={() => prompt.resolve(true)}
        onCancel={() => prompt.resolve(false)}
      />
      <Text color="gray">)</Text>
    </Box>
  );
};

const TextPrompt: React.FC<{ prompt: TuiPromptText }> = ({ prompt }) => {
  const handleSubmit = (value: string) => {
    // Use defaultValue if empty string submitted
    const finalValue = value === '' && prompt.defaultValue ? prompt.defaultValue : value;
    prompt.resolve(finalValue);
  };

  return (
    <Box marginY={1}>
      <Text bold>{prompt.message}</Text>
      {prompt.description && <Text color="gray"> {prompt.description}</Text>}
      <Text> </Text>
      <TextInputCustom placeholder={prompt.placeholder} isPassword={prompt.isPassword} onSubmit={handleSubmit} />
    </Box>
  );
};

export const Prompt: React.FC<PromptProps> = ({ prompt }) => {
  switch (prompt.type) {
    case 'select':
      return <SelectPrompt prompt={prompt} />;
    case 'multiSelect':
      return <MultiSelectPrompt prompt={prompt} />;
    case 'confirm':
      return <ConfirmPrompt prompt={prompt} />;
    case 'text':
      return <TextPrompt prompt={prompt} />;
    default:
      return null;
  }
};
